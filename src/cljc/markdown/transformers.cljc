(ns markdown.transformers
  (:require [clojure.string :as string]
            [markdown.links
             :refer [link
                     image
                     reference-link
                     image-reference-link
                     implicit-reference-link
                     footnote-link]]
            [markdown.lists :refer [li]]
            [markdown.tables :refer [table]]
            [markdown.common
             :refer
             [escape-code
              escaped-chars
              separator
              thaw-strings
              strong
              bold
              em
              italics
              strikethrough
              inline-code
              make-heading
              dashes]]))

(declare ^{:dynamic true} formatter)

(declare ^:dynamic *next-line*)

(defn heading? [text type]
  (when-not (every? #{\space} (take 4 text))
    (let [trimmed (if text (string/trim text))]
      (and (not-empty trimmed) (every? #{type} trimmed)))))

(defn h1? [text]
  (heading? text \=))

(defn h2? [text]
  (heading? text \-))

(defn empty-line [text state]
  (if (or (:code state) (:codeblock state))
    [text state]
    [(if (or (h1? text) (h2? text)) "" text)
     (if (string/blank? text) (dissoc state :hr :heading) state)]))

(defn superscript [text state]
  (if (:code state)
    [text state]
    (let [tokens (partition-by (partial contains? #{\^ \space}) text)]
      (loop [buf       []
             remaining tokens]
        (cond
          (empty? remaining)
          [(string/join buf) state]

          (= (first remaining) [\^])
          (recur (into buf (concat (seq "<sup>") (second remaining) (seq "</sup>")))
                 (drop 2 remaining))

          :default
          (recur (into buf (first remaining)) (rest remaining)))))))

(defn heading [text state]
  (cond
    (or (:codeblock state) (:code state))
    [text state]

    (h1? *next-line*)
    [(str "<h1>" text "</h1>") (assoc state :heading true)]

    (h2? *next-line*)
    [(str "<h2>" text "</h2>") (assoc state :heading true)]

    :else
    (if-let [heading (make-heading text (:heading-anchors state))]
      [heading (assoc state :heading true)]
      [text state])))

(defn br [text {:keys [code lists] :as state}]
  [(if (and (= [\space \space] (take-last 2 text))
            (not (or code lists)))
     (str (apply str (drop-last 2 text)) "<br />")
     text)
   state])

(defn autourl-transformer [text state]
  [(if (:code state)
     text
     (string/replace
       text
       #"<https?://[-A-Za-z0-9+&@#/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#/%=~_()|]>"
       #(let [url (subs % 1 (dec (count %)))]
         (str "<a href=\"" url "\">" url "</a>"))))
   state])

(defn autoemail-transformer [text state]
  [(if (or (:code state) (:codeblock state))
     text
     (string/replace
       text
       #"<[\w._%+-]+@[\w.-]+\.[\w]{2,4}>"
       #(let [encoded (if (:clojurescript state)
                        (subs % 1 (dec (count %)))
                        (->> (subs % 1 (dec (count %)))
                             (map (fn [c] (if (> (rand) 0.5) (formatter "&#x%02x;" (int c)) c)))
                             (apply str)))]
         (str "<a href=\"mailto:" encoded "\">" encoded "</a>"))))
   state])

(defn paragraph-text [last-line-empty? text]
  (if (and (not last-line-empty?) (not-empty text))
    (str " " text) text))

(defn paragraph
  [text {:keys [eof heading hr code lists blockquote paragraph last-line-empty?] :as state}]
  (cond
    (and paragraph lists)
    [(str "</p>" text) (assoc state :paragraph false)]

    (or heading hr code lists blockquote)
    [text state]

    paragraph
    (if (or eof (empty? (string/trim text)))
      [(str (paragraph-text last-line-empty? text) "</p>") (assoc state :paragraph false)]
      [(paragraph-text last-line-empty? text) state])

    (and (not eof) last-line-empty?)
    [(str "<p>" text) (assoc state :paragraph true :last-line-empty? false)]

    :default
    [text state]))

(defn code [text {:keys [eof lists code codeblock] :as state}]
  (cond
    (or lists codeblock)
    [text state]

    code
    (if (or eof (not= "    " (string/join (take 4 text))))
      [(str "</code></pre>" text) (assoc state :code false :last-line-empty? false)]
      [(str "\n" (escape-code (string/replace-first text #"    " ""))) state])

    (empty? (string/trim text))
    [text state]

    :default
    (let [num-spaces (count (take-while (partial = \space) text))]
      (if (> num-spaces 3)
        [(str "<pre><code>" (escape-code (string/replace-first text #"    " "")))
         (assoc state :code true)]
        [text state]))))


(defn codeblock [text state]
  (let [trimmed (string/trim text)]
    (cond
      (and (= [\` \` \`] (take 3 trimmed)) (:codeblock state))
      [(str "</code></pre>" (string/join (drop 3 trimmed))) (assoc state :code false :codeblock false :last-line-empty? false)]

      (and (= [\` \` \`] (take-last 3 trimmed)) (:codeblock state))
      [(str "</code></pre>" (string/join (drop-last 3 trimmed))) (assoc state :code false :codeblock false :last-line-empty? false)]

      (= [\` \` \`] (take 3 trimmed))
      (let [[lang code] (split-with (partial not= \space) (drop 3 trimmed))
            s         (apply str (rest code))
            formatter (:code-style state)]
        [(str "<pre><code" (if (not-empty lang)
                             (str " "
                                  (if formatter
                                    (formatter (string/join lang))
                                    (str "class=\"" (string/join lang) "\"")))) ">"
              (escape-code (if (empty? s) s (str s "\n"))))
         (assoc state :code true :codeblock true)])

      (:codeblock state)
      [(str (escape-code text) "\n") state]

      :default
      [text state])))

(defn hr [text state]
  (if (:code state)
    [text state]
    (if (and
          (or (empty? (drop-while #{\* \space} text))
              (empty? (drop-while #{\- \space} text))
              (empty? (drop-while #{\_ \space} text)))
          (> (count (remove #{\space} text)) 2))
      [(str "<hr/>") (assoc state :hr true)]
      [text state])))

(defn blockquote [text {:keys [eof code codeblock lists] :as state}]
  (let [trimmed (string/trim text)]
    (cond
      (or code codeblock lists)
      [text state]

      (:blockquote state)
      (cond (or eof (empty? trimmed))
            ["</p></blockquote>" (assoc state :blockquote false)]

            (= ">" trimmed)
            ["</p><p>" state]

            (= ">-" (subs trimmed 0 2))
            [(str "</p><footer>" (subs text 2) "</footer><p>") state]

            (= ">" (subs trimmed 0 1))
            [(str (subs text 1) " ") state]

            :default
            [(str text " ") state])

      :default
      (if (= \> (first text))
        [(str "<blockquote><p>" (string/join (rest text)) " ") (assoc state :blockquote true)]
        [text state]))))

(defn footer [footnotes]
  (if (empty? (:processed footnotes))
    ""
    (->> (:processed footnotes)
         (into (sorted-map))
         (reduce
           (fn [footnotes [id label]]
             (str footnotes
                  "<li id='fn-" id "'>"
                  (apply str (interpose " " label))
                  "<a href='#fnref" id "'>&#8617;</a></li>"))
           "")
         (#(str "<ol class='footnotes'>" % "</ol>")))))

(defn parse-metadata-line
  "Given a line of metadata header text return either a list containing a parsed
  and normalizd key and the original text of the value, or if no header is found
  (this is a continuation or new value from a pervious header key) simply
  return the text. If a blank or invalid line is found return nil."
  [line]
  (when line
    (let [[_ key val] (re-matches #"^([0-9A-Za-z_-]*):(.*)$" line)
          [_ next-val] (re-matches #"^    (.*)$" line)]
      (when (not= (string/trim line) "")
        (cond
          key [(keyword (string/lower-case key)) val]
          next-val line)))))

(defn flatten-metadata
  "Given a list of maps which contain a single key/value, flatten them all into
  a single map with all the leading spaces removed. If an empty list is provided
  then return nil."
  [metadata]
  (when (pos? (count metadata))
    (loop [acc      {}
           remain   metadata
           prev-key nil]
      (if (not (empty? remain))
        (let [data     (first remain)
              [key val] (if (sequential? data) data [prev-key data])
              prev-val (get acc key [])
              postfix  (if (= [\space \space] (take-last 2 val)) "\n" "")
              norm-val (str (string/trim val) postfix)
              new-val  (if-not (empty? norm-val)
                         (conj prev-val norm-val)
                         prev-val)]
          (recur (merge acc {key new-val}) (rest remain) key))
        acc))))

(defn parse-metadata-headers
  "Given a sequence of lines from a markdown document, attempt to parse a
  metadata header if it exists."
  [lines-seq]
  {:pre [(sequential? lines-seq)
         (every? string? lines-seq)]}
  (reduce
    (fn [acc line]
      (if-let [parsed (parse-metadata-line line)]
        (conj acc parsed)
        (reduced (flatten-metadata acc))))
    [] lines-seq))

(def transformer-vector
  [empty-line
   codeblock
   code
   escaped-chars
   inline-code
   autoemail-transformer
   autourl-transformer
   image
   image-reference-link
   link
   implicit-reference-link
   reference-link
   footnote-link
   hr
   li
   heading
   italics
   em
   strong
   bold
   strikethrough
   superscript
   blockquote
   table
   paragraph
   br
   thaw-strings
   dashes])

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
              freeze-string
              separator
              thaw-strings
              strong
              bold
              bold-italic
              em
              italics
              strikethrough
              inline-code
              escape-inhibit-separator
              inhibit
              make-heading
              dashes]]))

(declare ^:dynamic *formatter*)

(defn heading? [text type]
  (when-not (every? #{\space} (take 4 text))
    (let [trimmed (if text (string/trim text))]
      (and (not-empty trimmed) (every? #{type} trimmed)))))

(defn h1? [text]
  (heading? text \=))

(defn h2? [text]
  (heading? text \-))

(defn empty-line [text {:keys [code codeblock] :as state}]
  (if (or code codeblock)
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

(defn heading [text {:keys [buf next-line code codeblock heading-anchors] :as state}]
  (cond
    (or codeblock code)
    [text state]

    (h1? (or buf next-line))
    [(str "<h1>" text "</h1>") (assoc state :heading true)]

    (h2? (or buf next-line))
    [(str "<h2>" text "</h2>") (assoc state :heading true)]

    :else
    (if-let [heading (make-heading text heading-anchors)]
      [heading (assoc state :inline-heading true)]
      [text state])))

(defn br [text {:keys [code lists] :as state}]
  [(if (and (= [\space \space] (take-last 2 text))
            (not (or code lists)))
     (str (apply str (drop-last 2 text)) "<br />")
     text)
   state])

(defn autourl-transformer [text {:keys [code frozen-strings] :as state}]
  (if code
    [text state]
    (let [currently-frozen (volatile! {:frozen-strings frozen-strings})]
      [(string/replace
         text
         #"<https?://[-A-Za-z0-9+&@#/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#/%=~_()|]>"
         #(let [[url frozen-strings] (freeze-string (subs % 1 (dec (count %))) @currently-frozen)]
            (vreset! currently-frozen frozen-strings)
            (str "<a href=\"" url "\">" url "</a>")))
       (merge state @currently-frozen)])))

(defn autoemail-transformer [text state]
  [(if (or (:code state) (:codeblock state))
     text
     (string/replace
       text
       #"<[\w._%+-]+@[\w.-]+\.[\w]{2,4}>"
       #(let [encoded (if (:clojurescript state)
                        (subs % 1 (dec (count %)))
                        (->> (subs % 1 (dec (count %)))
                             (map (fn [c] (if (> (rand) 0.5) (*formatter* "&#x%02x;" (int c)) c)))
                             (apply str)))]
          (str "<a href=\"mailto:" encoded "\">" encoded "</a>"))))
   state])

(defn set-line-state [text {:keys [inline-heading] :as state}]
  [text
   (-> state
       (dissoc :inline-heading)
       (assoc-in [:temp :inline-heading] inline-heading))])

(defn clear-line-state [text state]
  [text (dissoc state :temp)])

(defn paragraph-text [last-line-empty? text]
  (if (and (not last-line-empty?) (not-empty text))
    (str " " text)
    text))

(defn open-paragraph
  [text {:keys [eof heading inline-heading temp hr code lists blockquote paragraph last-line-empty?] :as state}]
  (cond
    (and paragraph lists)
    [(str "</p>" text) (dissoc state :paragraph)]

    (or heading inline-heading hr code lists blockquote)
    [text state]

    paragraph
    (if (or eof (empty? (string/trim text)))
      [(str (paragraph-text last-line-empty? text) "</p>") (dissoc state :paragraph)]
      [(paragraph-text last-line-empty? text) state])

    (and (not eof) (not (string/blank? text)) (or (:inline-heading temp) last-line-empty?))
    [(str "<p>" text) (assoc state :paragraph true :last-line-empty? false)]

    :default
    [text state]))

(defn close-paragraph [text {:keys [next-line paragraph] :as state}]
  (if (and paragraph (= [\` \` \`] (take 3 next-line)))
    [(str text "</p>") (dissoc state :paragraph)]
    [text state]))

(defn paragraph [text state]
  (apply close-paragraph (open-paragraph text state)))

(defn code [text {:keys [eof lists code codeblock] :as state}]
  (cond
    (or lists codeblock)
    [text state]

    code
    (if (or eof (not= "    " (string/join (take 4 text))))
      [(str "</code></pre>" text) (dissoc state :indented-code :code :last-line-empty?)]
      [(str "\n" (escape-code (string/replace-first text #"    " ""))) state])

    (empty? (string/trim text))
    [text state]

    :default
    (let [num-spaces (count (take-while (partial = \space) text))]
      (if (> num-spaces 3)
        [(str "<pre><code>" (escape-code (string/replace-first text #"    " "")))
         (assoc state :code true :indented-code true)]
        [text state]))))

(defn codeblock [text {:keys [codeblock codeblock-end indented-code next-line] :as state}]
  (let [trimmed (string/trim text)]
    (cond
      codeblock-end
      [text (-> state
                (assoc :last-line-empty? true)
                (dissoc :code :codeblock :codeblock-end))]

      (and (= [\` \` \`] (take-last 3 (some-> next-line string/trim))) codeblock)
      [(str (escape-code (str text "\n" (apply str (drop-last 3 next-line)))) "</code></pre>")
       (assoc state :skip-next-line? true :codeblock-end true :last-line-empty? true)]

      (and
        (not indented-code)
        (= [\` \` \`] (take 3 trimmed)))
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

      codeblock
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

(defn blockquote-1
  "Check for blockquotes and signal to blockquote-2 function with
  states blockquote-start and blockquote-end so that tags can be added.
  This approach enables lists to be included in blockquotes."
  [text {:keys [eof code codeblock lists] :as state}]
  (let [trimmed (string/trim text)]
    (cond
      (or code codeblock)
      [text state]

      (:blockquote state)
      (cond (or eof (empty? trimmed))
            [text (assoc state :blockquote-end true :blockquote false)]

            (= ">" trimmed)
            [(str (when (:blockquote-paragraph state) "</p>") "<p>") (assoc state :blockquote-paragraph true)]

            (and (>= (count trimmed) 2) (= ">-" (subs trimmed 0 2)))
            [(str (when (:blockquote-paragraph state) "</p>") "<footer>" (subs text 2) "</footer>") (assoc state :blockquote-paragraph false)]

            (= ">" (subs trimmed 0 1))
            [(str (when-not (:blockquote-paragraph state) "<p>") (subs text 1) " ") (assoc state :blockquote-paragraph true)]

            :default
            [(str (when-not (:blockquote-paragraph state) "<p>") text " ") (assoc state :blockquote-paragraph true)])

      :default
      (if (= \> (first text))
        [(str (string/join (rest text)) " ")
         (assoc state :blockquote-start true :blockquote true :blockquote-paragraph true)]
        [text state]))))

(defn blockquote-2
  "Check for change in blockquote states and add start or end tags.
  Closing a blockquote with a list in it is a bit more complex, 
  as the list is not closed until the following blank line."
  [text {:keys [blockquote-start blockquote-end blockquote-paragraph lists] :as state}]
  (let [not-in-list (or (not lists) (empty? lists))]
    (cond blockquote-start
          [(str "<blockquote><p>" text)
           (dissoc state :blockquote-start)]
          
          (and blockquote-end not-in-list)
          [(str text (when blockquote-paragraph "</p>") "</blockquote>")
           (dissoc state :blockquote :blockquote-paragraph :blockquote-end )]
          
          :default
          [text state])))

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
  [set-line-state
   empty-line
   inhibit
   escape-inhibit-separator
   code
   codeblock
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
   blockquote-1
   li
   heading
   blockquote-2
   italics
   bold-italic
   em
   strong
   bold
   strikethrough
   superscript
   table
   paragraph
   br
   thaw-strings
   dashes
   clear-line-state])

(ns markdown.transformers
  (:require [clojure.string :as string]))

(declare ^{:dynamic true} formatter)

(declare ^{:dynamic true} *substring*)

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

(defn escape-code [s]
  (-> s
      (string/replace #"&" "&amp;")
      (string/replace #"\*" "&#42;")
      (string/replace #"\^" "&#94;")
      (string/replace #"\_" "&#95;")
      (string/replace #"\~" "&#126;")
      (string/replace #"\<" "&lt;")
      (string/replace #"\>" "&gt;")
      ;(string/replace #"\/" "&frasl;") ;screws up ClojureScript compiling
      (string/replace #"\[" "&#91;")
      (string/replace #"\]" "&#93;")
      (string/replace #"\(" "&#40;")
      (string/replace #"\)" "&#41;")
      (string/replace #"\"" "&quot;")))

(def terminal-char-encodings
  [["*" #"\*" "&terminal#42"]
   ["^" #"\^" "&terminal#94"]
   ["_" #"\_" "&terminal#95"]
   ["~" #"\~" "&terminal#126"]])

(defn unescape-terminally-encoded-chars
  "Remove the terminal encodings. Should probably only do this at the very end
   or unless you know exactly what you are doing!"
  [text]
  (reduce (fn [text [char-str _ char-replacement]]
            (string/replace text char-replacement char-str))
          text
          terminal-char-encodings))

(defn escape-terminally-encoded-chars
  " Terminally encode these chars, so that at the end we can replace them.
  This is so that subsequent processing does not accidentally convert these into
  html (like italics or bold) -- what a mess that would be!"
  [& xs]
  (reduce (fn [str [_ char-regex char-replacement]]
            (string/replace str char-regex char-replacement))
          (->> xs (apply concat) string/join)
          terminal-char-encodings))

(defn escaped-chars [text state]
  [(if (or (:code state) (:codeblock state))
     text
     (-> text
         (string/replace #"\\\\" "&#92;")
         (string/replace #"\\`" "&#8216;")
         (string/replace #"\\\*" "&#42;")
         (string/replace #"\\_" "&#95;")
         (string/replace #"\\\{" "&#123;")
         (string/replace #"\\\}" "&#125;")
         (string/replace #"\\\[" "&#91;")
         (string/replace #"\\\]" "&#93;")
         (string/replace #"\\\(" "&#40;")
         (string/replace #"\\\)" "&#41;")
         (string/replace #"\\#" "&#35;")
         (string/replace #"\\\+" "&#43;")
         (string/replace #"\\-" "&#45;")
         (string/replace #"\\\." "&#46;")
         (string/replace #"\\!" "&#33;")))
   state])

(defn separator [escape? text open close separator state]
  (if (:code state)
    [text state]
    (loop [out       []
           buf       []
           tokens    (partition-by (partial = (first separator)) (seq text))
           cur-state (assoc state :found-token false)]
      (cond
        (empty? tokens)
        [(string/join (into (if (:found-token cur-state) (into out separator) out) buf))
         (dissoc cur-state :found-token)]

        (:found-token cur-state)
        (if (= (first tokens) separator)
          (recur (vec
                   (concat
                     out
                     (seq open)
                     (if escape? (seq (escape-code (string/join buf))) buf)
                     (seq close)))
                 []
                 (rest tokens)
                 (assoc cur-state :found-token false))
          (recur out
                 (into buf (first tokens))
                 (rest tokens)
                 cur-state))

        (= (first tokens) separator)
        (recur out buf (rest tokens) (assoc cur-state :found-token true))

        :default
        (recur (into out (first tokens)) buf (rest tokens) cur-state)))))


(defn strong [text state]
  (separator false text "<strong>" "</strong>" [\* \*] state))

(defn bold [text state]
  (separator false text "<b>" "</b>" [\_ \_] state))

(defn em [text state]
  (separator false text "<em>" "</em>" [\*] state))

(defn italics [text state]
  (separator false text "<i>" "</i>" [\_] state))

(defn inline-code [text state]
  (separator true text "<code>" "</code>" [\`] state))

(defn strikethrough [text state]
  (separator false text "<del>" "</del>" [\~ \~] state))

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

(defn heading-text [text]
  (->> text
       (drop-while #(or (= \# %) (= \space %)))
       (take-while #(not= \# %))
       (string/join)
       (string/trim)))

(defn heading-level [text]
  (let [num-hashes (count (filter #(not= \space %) (take-while #(or (= \# %) (= \space %)) (seq text))))]
    (if (pos? num-hashes) num-hashes)))

(defn make-heading [text heading-anchors]
  (if-let [heading (heading-level text)]
    (let [text (heading-text text)]
      (str "<h" heading ">"
           (if heading-anchors (str "<a name=\"" (-> text string/lower-case (string/replace " " "&#95;")) "\"></a>"))
           text "</h" heading ">"))))

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
      [(str "\n</code></pre>" text) (assoc state :code false :last-line-empty? false)]
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

(defn href [title link]
  (escape-terminally-encoded-chars (seq "<a href='") link (seq "'>") title (seq "</a>")))

(defn img [alt url & [title]]
  (escape-terminally-encoded-chars
    (seq "<img src=\"") url (seq "\" alt=\"") alt
    (if (not-empty title)
      (seq (apply str "\" title=" (string/join title) " />"))
      (seq "\" />"))))

(defn handle-img-link [xs]
  (if (= [\[ \! \[] (take 3 xs))
    (let [xs (drop 3 xs)
          [alt xy] (split-with (partial not= \]) xs)
          [url-title zy] (->> xy (drop 2) (split-with (partial not= \))))
          [url title] (split-with (partial not= \space) url-title)]
      (concat "[" (img alt url (not-empty title)) (rest zy)))
    xs))

(defn process-link-title [title state]
  (first
    (reduce
      #(apply %2 %1)
      [title state]
      [italics em strong bold strikethrough])))

(defn link [text {:keys [code codeblock] :as state}]
  (if (or code codeblock)
    [text state]
    (loop [out    []
           tokens (seq text)]
      (if (empty? tokens)
        [(string/join out) state]

        (let [[head xs] (split-with (partial not= \[) tokens)
              xs (handle-img-link xs)
              [title ys] (split-with (partial not= \]) xs)
              [dud zs] (split-with (partial not= \() ys)
              [link tail] (split-with (partial not= \)) zs)]

          (if (or (< (count link) 2)
                  (< (count tail) 1)
                  (> (count dud) 1))
            (recur (concat out head (process-link-title title state) dud link) tail)
            (recur
              (into out
                    (if (= (last head) \!)
                      (let [alt   (rest title)
                            [url title] (split-with (partial not= \space) (rest link))
                            title (process-link-title (string/join (rest title)) state)]
                        (concat (butlast head) (img alt url title)))
                      (concat head (href (rest (process-link-title title state)) (rest link)))))
              (rest tail))))))))

(defn reference [text]
  (re-find #"^\[[a-zA-Z0-9 ]+\]:" text))

(defn parse-reference [reference start]
  (-> reference
      (subs start)
      (string/trim)
      (string/split #"\s+" 2)))

(defn parse-reference-link [line references]
  (let [trimmed (string/trim line)]
    (when-let [link (reference trimmed)]
      (swap! references assoc (subs link 0 (dec (count link)))
             (parse-reference trimmed (inc (count link)))))))

(defn replace-reference-link [references reference]
  (let [[title id] (string/split reference #"\]\s*" 2)
        [link alt] (get references id)]
    (str "<a href='" link "'" (when alt (str " title='" (subs alt 1 (dec (count alt))) "'")) ">" (subs title 1) "</a>")))

(defn reference-link [text {:keys [code codeblock references] :as state}]
  (cond
    (nil? references)
    [text state]

    (reference (string/trim text))
    ["" state]

    :else
    [(if (or code codeblock)
       text
       (string/replace text #"\[[a-zA-Z0-9 ]+\]\s*\[[a-zA-Z0-9 ]+\]" (partial replace-reference-link references)))
     state]))

(defn close-lists [lists]
  (string/join
    (for [[list-type] lists]
      (str "</li></" (name list-type) ">"))))


(defn add-row [row-type list-type num-indents indents content state]
  (if list-type
    (cond
      (< num-indents indents)
      (let [lists-to-close  (take-while #(> (second %) num-indents) (reverse (:lists state)))
            remaining-lists (vec (drop-last (count lists-to-close) (:lists state)))]

        [(apply str (close-lists lists-to-close) "</li><li>" content)
         (assoc state :lists (if (> num-indents (second (last remaining-lists)))
                               (conj remaining-lists [row-type num-indents])
                               remaining-lists))])

      (> num-indents indents)
      [(str "<" (name row-type) "><li>" content)
       (update-in state [:lists] conj [row-type num-indents])]

      (= num-indents indents)
      [(str "</li><li>" content) state])

    [(str "<" (name row-type) "><li>" content)
     (assoc state :lists [[row-type num-indents]])]))

(defn ul [text state]
  (let [[list-type indents] (last (:lists state))
        num-indents (count (take-while (partial = \space) text))
        content     (string/trim (*substring* text (inc num-indents)))]
    (add-row :ul list-type num-indents indents (or (make-heading content false) content) state)))

(defn ol [text state]
  (let [[list-type indents] (last (:lists state))
        num-indents (count (take-while (partial = \space) text))
        content     (string/trim (string/join (drop-while (partial not= \space) (string/trim text))))]
    (add-row :ol list-type num-indents indents (or (make-heading content false) content) state)))

(defn li [text {:keys [code codeblock last-line-empty? eof lists] :as state}]
  (cond

    (and last-line-empty? (string/blank? text))
    [(str (close-lists (reverse lists)) text)
     (-> state (dissoc :lists) (assoc :last-line-empty? false))]

    (or code codeblock)
    (if (and lists (or last-line-empty? eof))
      [(str (close-lists (reverse lists)) text)
       (-> state (dissoc :lists) (assoc :last-line-empty? false))]
      [text state])

    (and (not eof)
         lists
         (string/blank? text))
    [text (assoc state :last-line-empty? true)]

    :else
    (let [indents  (if last-line-empty? 0 (count (take-while (partial = \space) text)))
          trimmed  (string/trim text)
          in-list? (:lists state)]
      (cond
        (re-find #"^[\*\+-] " trimmed)
        (ul (if in-list? text trimmed) state)

        (re-find #"^[0-9]+\. " trimmed)
        (ol (if in-list? text trimmed) state)

        (pos? indents)
        [text state]

        (and (or eof last-line-empty?)
             (not-empty lists))
        [(close-lists (reverse lists))
         (assoc state :lists [] :buf text)]

        :else
        [text state]))))

(defn cleanup-terminally-encoded-chars
  "Terminally encoded chars are ones that we've determined should no longer be processed or evaluated
  Things like _ in a href for a link, for example."
  [text state]
  [(unescape-terminally-encoded-chars text) state])


(def transformer-vector
  [empty-line
   codeblock
   code
   escaped-chars
   inline-code
   autoemail-transformer
   autourl-transformer
   link
   reference-link
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
   paragraph
   br
   cleanup-terminally-encoded-chars])

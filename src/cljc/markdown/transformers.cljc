(ns markdown.transformers
  (:require [clojure.string :as string]
            [clojure.edn :as edn]
            [markdown.links
             :refer [link
                     image
                     reference-link
                     image-reference-link
                     implicit-reference-link
                     footnote-link]]
            [markdown.lists :refer [li close-lists content-indent]]
            [markdown.tables :refer [table]]
            [markdown.common
             :refer
             [escape-code
              escaped-chars
              freeze-string
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
              dashes]]
            #?(:clj [clj-yaml.core :as yaml])))

(def ^:dynamic *formatter*)

(defn heading? [text type]
  (when-not (every? #{\space} (take 4 text))
    (let [trimmed (some-> text string/trim)]
      (and (not-empty trimmed) (every? #{type} trimmed)))))

(defn h1? [text]
  (heading? text \=))

(defn h2? [text]
  (heading? text \-))

(defn leading-spaces [text]
  (count (take-while (partial = \space) (or text ""))))

(def ^:private closing-tag-re
  #"^(?:</(?:p|li|ul|ol|blockquote|pre|code|table|thead|tbody|tr|th|td|dl|dt|dd|h[1-6])>\s*)+$")

(defn closing-tag-text?
  "True when the line's text is closing markup that an earlier transformer
  emitted for a block ending here, not content from the source line. Closing
  a list or blockquote on a blank line leaves text such as `</li></ul>` or
  `</p></blockquote>`: wrapping that in a paragraph, or using it as the body
  of a setext heading, nests the tags and swallows the line that follows."
  [text]
  (some? (re-matches closing-tag-re (string/trim (or text "")))))

(defn setext-underline
  "Returns :h1 or :h2 when the following line underlines text, nil otherwise.
  List content only counts when the underline is indented past the item's
  marker, a line that already produced list markup is never underlined, and an
  unmarked line continuing a blockquote is lazy continuation text, which no
  underline may attach to."
  [text {:keys [next-line hr lists list-line blockquote]}]
  (let [quoted? (or blockquote (string/starts-with? (string/triml (or text "")) ">"))]
    (when (and (not (string/blank? text))
               (not (closing-tag-text? text))
               (not hr)
               (not list-line)
               (not (and quoted?
                         (not (string/starts-with? (string/triml (or next-line "")) ">"))))
               (>= (leading-spaces next-line) (content-indent lists)))
      (cond
        (h1? next-line) :h1
        (h2? next-line) :h2))))

(defn empty-line [text {:keys [code codeblock heading] :as state}]
  (if (or code codeblock)
    [text state]
    (cond
      ;; strip the underline of a setext heading emitted on the previous line
      (and heading (or (h1? text) (h2? text)))
      ["" (-> state
              (dissoc :heading)
              (assoc :heading-end 2))]

      (string/blank? text)
      [text (dissoc state :hr :heading)]

      :default
      [text state])))

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

(defn heading [text {:keys [code codeblock heading-anchors] :as state}]
  (if (or codeblock code)
    [text state]
    (if-let [level (setext-underline text state)]
      [(str "<" (name level) ">" text "</" (name level) ">") (assoc state :heading true)]
      (if-let [heading (make-heading text heading-anchors)]
        [heading (assoc state :inline-heading true)]
        [text state]))))

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
  (let [left-pad (fn [s]
                   (cond->> s
                     (= 1 (count s)) (str "0")))
        encoder  (if (:clojurescript state)
                   (fn [c] (str "&#x" (-> c (.charCodeAt 0) (.toString 16) left-pad) ";"))
                   (fn [c] (*formatter* "&#x%02x;" (int c))))]
    [(if (or (:code state) (:codeblock state))
       text
       (string/replace
        text
        #"<[\w._%+-]+@[\w.-]+\.[\w]{2,4}>"
        #(let [encoded (->> (subs % 1 (dec (count %)))
                            (map encoder)
                            (apply str))]
           (str "<a href=\"mailto:" encoded "\">" encoded "</a>"))))
     state]))

(defn set-line-state [text {:keys [inline-heading] :as state}]
  [text
   (-> state
       (dissoc :inline-heading)
       (assoc-in [:temp :inline-heading] inline-heading))])

(defn tick
  "Count a multi-line state flag down, clearing it once a line has seen it."
  [state k]
  (let [n (get state k)]
    (cond
      (nil? n) state
      (= 1 n)  (dissoc state k)
      :else    (assoc state k (dec n)))))

(defn clear-line-state [text state]
  [text (-> state
            (dissoc :temp :hr :list-line)
            (tick :heading-end)
            (tick :hr-end))])

(defn paragraph-text [last-line-empty? text]
  (if (and (not last-line-empty?) (not-empty text))
    (str " " text)
    text))

(defn open-paragraph
  [text {:keys [eof heading inline-heading temp hr hr-end code lists blockquote paragraph last-line-empty? heading-end] :as state}]
  (let [starts-block? (or last-line-empty? hr-end)]
    (cond
      (and paragraph lists)
      [(str "</p>" text) (dissoc state :paragraph)]

      ;; leftover closing markup of a block that just ended is already block
      ;; level output, so it must not be wrapped in a paragraph of its own
      (or heading inline-heading hr code lists blockquote)
      [text state]

      paragraph
      (if (or eof (empty? (string/trim text)))
        [(str (paragraph-text starts-block? text) "</p>") (dissoc state :paragraph)]
        [(paragraph-text starts-block? text) state])

      ;; leftover closing markup of a block that just ended is already block
      ;; level output, so it must not be wrapped in a paragraph of its own
      (and (not eof) (not (string/blank? text)) (not (closing-tag-text? text))
           (or (:inline-heading temp) starts-block? heading-end))
      [(str "<p>" text) (assoc state :paragraph true :last-line-empty? false)]

      :default
      [text state])))

(defn close-paragraph [text {:keys [next-line paragraph] :as state}]
  (if (and paragraph (some-> next-line string/trim (string/ends-with? "```")))
    [(str text "</p>") (dissoc state :paragraph)]
    [text state]))

(defn paragraph [text state]
  (apply close-paragraph (open-paragraph text state)))

(defn code [text {:keys [eof indent-code-end next-line lists code codeblock paragraph html-tag-open] :as state}]
  (let [should-close? (or eof
                          (not (or (string/blank? next-line)
                                   (string/starts-with? next-line "    "))))]
    (cond
      (or lists codeblock)
      [text state]

      ;; indented attributes of a multiline html tag are not a code block
      (and html-tag-open (not code))
      [text state]

      indent-code-end
      [text (-> state
                (dissoc :code :indent-code-end :indented-code)
                (assoc :last-line-empty? true))]

      code
      [(str (escape-code (string/replace-first text #"    " "\n"))
            (when should-close? "</code></pre>"))
       (cond-> state
         should-close? (assoc :indent-code-end true))]

      paragraph
      [text state]

      (empty? (string/trim text))
      [text state]

      :default
      (let [num-spaces (count (take-while (partial = \space) text))]
        (if (>= num-spaces 4)
          [(str "<pre><code>"
                (escape-code (string/replace-first text #"    " ""))
                (when should-close? "</code></pre>"))
           (cond-> (assoc state :code true :indented-code true)
             should-close? (assoc :indent-code-end true))]
          [text state])))))

(defn codeblock [text {:keys [codeblock-no-escape? codeblock-no-tags? codeblock-buf codeblock-lang codeblock-callback codeblock codeblock-end eof indented-code next-line lists] :as state}]
  (let [trimmed           (string/trim text)
        next-line-closes? (some-> next-line string/trim (string/ends-with? "```"))]
    (cond
      (and lists codeblock-end)
      ["" (dissoc state :code :codeblock :codeblock-end :codeblock-lang :codeblock-buf)]

      codeblock-end
      [text (-> state
                (assoc :last-line-empty? true)
                (dissoc :code :codeblock :codeblock-end :codeblock-lang :codeblock-buf))]

      (and next-line-closes? codeblock)
      (let [buffered-code (str codeblock-buf text \newline (apply str (first (string/split next-line #"```"))))
            code (if codeblock-callback (codeblock-callback buffered-code codeblock-lang) buffered-code)]
        [(str
          (if codeblock-no-escape?
            code
            (escape-code code))
          (when (not codeblock-no-tags?)
            "</code></pre>"))
         (assoc state :skip-next-line? (not lists)
                :codeblock-end true
                :last-line-empty? (not lists))])

      (and
       (not indented-code)
       (string/starts-with? trimmed "```"))
      (let [[lang code] (split-with (partial not= \newline) (drop 3 trimmed))
            lang      (string/trim (string/join lang))
            s         (apply str (rest code))
            code-formatter (:code-style state)
            pre-formatter (:pre-style state)]
        [(str
          (when (not codeblock-no-tags?)
            (str
             "<pre"
             (when (seq lang)
               (if pre-formatter
                 (str " " (pre-formatter lang))
                 ""))
             "><code"
             (when (seq lang)
               (str " "
                    (if code-formatter
                      (code-formatter lang)
                      (str "class=\"" (string/join lang) "\""))))
             ">"))
          (escape-code (if (empty? s) s (str s "\n")))
          (when (and next-line-closes? (not codeblock-no-tags?))
            "</code></pre>"))
         (if next-line-closes?
           (assoc state :codeblock-end true :skip-next-line? true)
           (assoc state :code true
                  :codeblock true
                  :codeblock-lang lang
                  :codeblock-buf ""))])

      codeblock
      (if eof
        (let [code (if codeblock-callback
                     (codeblock-callback codeblock-buf codeblock-lang)
                     codeblock-buf)]
          [(str (if codeblock-no-escape?
                  code
                  (escape-code code))
                (when (not codeblock-no-tags?)
                  "</code></pre>"))
           (-> state
               (dissoc :code :codeblock :codeblock-buf :codeblock-lang)
               (assoc :last-line-empty? true))])
        ["" (assoc state :codeblock-buf (str codeblock-buf text \newline))])

      :default
      [text state])))

(defn thematic-break? [text]
  (and (or (empty? (drop-while #{\* \space} text))
           (empty? (drop-while #{\- \space} text))
           (empty? (drop-while #{\_ \space} text)))
       (> (count (remove #{\space} text)) 2)))

(defn hr [text {:keys [code lists paragraph blockquote blockquote-paragraph] :as state}]
  (if (or code (not (thematic-break? text)))
    [text state]
    (let [;; a break shallower than the innermost item's content column cannot
          ;; belong to the item, so it ends the list instead
          close? (and (seq lists) (< (leading-spaces text) (content-indent lists)))]
      [(str (when paragraph "</p>")
            (when close? (close-lists (reverse lists)))
            ;; a break is not paragraph text: an open blockquote and its
            ;; paragraph close ahead of it instead of wrapping the rule
            (when blockquote (str (when blockquote-paragraph "</p>") "</blockquote>"))
            "<hr/>")
       (cond-> (assoc state :hr true :hr-end 2)
         paragraph  (dissoc :paragraph)
         blockquote (dissoc :blockquote :blockquote-paragraph :blockquote-end :blockquote-in-list)
         close?     (dissoc :lists))])))

(defn- blockquote-open
  "Starts a blockquote on `text`. A blockquote cannot start inside a paragraph
  or a list item, so any block still open is closed ahead of the quote tags."
  [text state]
  (let [open-lists (seq (:lists state))]
    [(str (string/join (rest text)) " ")
     (cond-> (assoc state
                    :blockquote-start true :blockquote true :blockquote-paragraph true
                    :blockquote-pre (str (when (:paragraph state) "</p>")
                                         (when open-lists (close-lists (reverse open-lists)))))
       (:paragraph state) (dissoc :paragraph)
       open-lists         (dissoc :lists))]))

;; list items whose content starts at or before `indent`
(defn- lists-holding [lists indent]
  (vec (take-while #(<= (or (nth % 2 nil) (second %)) indent) lists)))

(defn- list-item-quote?
  "True when `text` is a `>` line indented into the content of an open list
  item, which makes the quote part of that item. Four or more spaces past the
  content column would be an indented code block, so those are left alone."
  [text {:keys [lists]}]
  (let [indent (leading-spaces text)
        holding (lists-holding lists indent)]
    (and (seq holding)
         (< (- indent (content-indent holding)) 4)
         (= \> (nth text indent nil)))))

(defn- blockquote-open-in-list
  "Starts a blockquote inside the list item whose content column `text` is
  indented to. Lists nested deeper than that are closed ahead of the quote."
  [text {:keys [lists] :as state}]
  (let [indent  (leading-spaces text)
        holding (lists-holding lists indent)
        deeper  (drop (count holding) lists)]
    [(str (subs text (inc indent)) " ")
     (assoc state
            :blockquote-start true :blockquote true :blockquote-paragraph true
            :blockquote-in-list true
            :blockquote-pre (when (seq deeper) (close-lists (reverse deeper)))
            :lists holding)]))

(defn- list-marker? [trimmed]
  (boolean (re-find #"^(?:[\*\+-]|[0-9]+\.)(?: |$)" trimmed)))

(defn- blockquote-continue
  "Renders one line of an already open blockquote."
  [text {:keys [blockquote-paragraph] :as state} trimmed]
  (cond
    (= ">" trimmed)
    [(str (when blockquote-paragraph "</p>") "<p>") (assoc state :blockquote-paragraph true)]

    (and (>= (count trimmed) 2) (= ">-" (subs trimmed 0 2)))
    [(str (when blockquote-paragraph "</p>") "<footer>" (subs text 2) "</footer>")
     (assoc state :blockquote-paragraph false)]

    (= ">" (subs trimmed 0 1))
    [(str (when-not blockquote-paragraph "<p>") (subs text 1) " ")
     (assoc state :blockquote-paragraph true)]

    :default
    [(str (when-not blockquote-paragraph "<p>") text " ")
     (assoc state :blockquote-paragraph true)]))

(defn blockquote-1
  "Check for blockquotes and signal to blockquote-2 function with
  states blockquote-start and blockquote-end so that tags can be added.
  This approach enables lists to be included in blockquotes."
  [text {:keys [eof code codeblock blockquote html-tag-open] :as state}]
  (let [trimmed (string/trim text)]
    (cond
      (or code codeblock)
      [text state]

      ;; a `>` closing a multiline html tag does not start a blockquote
      (and html-tag-open (not blockquote))
      [text state]

      (not blockquote)
      (cond
        (= \> (first text))           (blockquote-open text state)
        (list-item-quote? text state) (blockquote-open-in-list text state)
        :else                         [text state])

      (or eof (empty? trimmed))
      [text (assoc state :blockquote-end true :blockquote false)]

      ;; a new list item ends a quote nested in the previous item
      (and (:blockquote-in-list state) (list-marker? trimmed))
      [text (assoc state :blockquote-end true :blockquote false)]

      (:blockquote-in-list state)
      (blockquote-continue (string/triml text) state trimmed)

      :default
      (blockquote-continue text state trimmed))))

(defn- scan-html-tag
  "Scans `text` for html tag syntax starting from `open`, the tag state left
  by the previous line: nil outside a tag, :tag inside one, or the quote
  character of an attribute value left open. Returns the state at the end of
  the line, so a tag whose `>` is on a later line keeps it non-nil."
  [text open]
  (let [n (count text)]
    (loop [i 0 open open]
      (if (>= i n)
        open
        (let [c (nth text i)]
          (cond
            (#{\" \'} open)
            (recur (inc i) (if (= c open) :tag open))

            (= :tag open)
            (cond
              (#{\" \'} c) (recur (inc i) c)
              (= \> c)      (recur (inc i) nil)
              :else         (recur (inc i) open))

            (and (= \< c) (< (inc i) n)
                 (re-matches #"[a-zA-Z/]" (str (nth text (inc i)))))
            (recur (+ i 2) :tag)

            :else
            (recur (inc i) open)))))))

(defn html-tag
  "Tracks an html tag left open at the end of a line, such as `<img` followed
  by attributes on the lines below. Those lines are part of the tag: an
  indented attribute is not a code block and the closing `>` on a line of
  its own is not a blockquote. A blank line ends the tag as far as markdown
  is concerned, which keeps a stray `<` in prose from leaking further."
  [text {:keys [code codeblock raw-html-close html-tag-open] :as state}]
  (cond
    (or code codeblock raw-html-close (string/blank? text))
    [text (dissoc state :html-tag-open)]

    :else
    (let [open (scan-html-tag text html-tag-open)]
      [text (if open
              (assoc state :html-tag-open open)
              (dissoc state :html-tag-open))])))

(defn blockquote-2
  "Check for change in blockquote states and add start or end tags.
  Closing a blockquote with a list in it is a bit more complex,
  as the list is not closed until the following blank line."
  [text {:keys [blockquote-start blockquote-end blockquote-paragraph blockquote-in-list lists] :as state}]
  (let [not-in-list (or (not lists) (empty? lists))]
    (cond blockquote-start
          [(str (:blockquote-pre state) "<blockquote><p>" text)
           (dissoc state :blockquote-start :blockquote-pre)]

          ;; a quote nested in a list item closes ahead of whatever the
          ;; line did to the list, such as starting the next item
          (and blockquote-end blockquote-in-list)
          [(str (when blockquote-paragraph "</p>") "</blockquote>" text)
           (dissoc state :blockquote :blockquote-paragraph :blockquote-end :blockquote-in-list)]

          (and blockquote-end not-in-list)
          [(str text (when blockquote-paragraph "</p>") "</blockquote>")
           (dissoc state :blockquote :blockquote-paragraph :blockquote-end)]

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
      (if (seq remain)
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


(defn parse-wiki-metadata-headers
  [lines-seq]
  (reduce
   (fn [acc line]
     (if-let [parsed (parse-metadata-line line)]
       (conj acc parsed)
       (reduced [(flatten-metadata acc) (count acc)])))
   [] lines-seq))

(defn parse-yaml-metadata-headers
  [lines-seq]
  #?(:clj
     (let [yaml-lines (->> lines-seq
                           ;; leave off opening ---
                           (drop 1)
                           ;; take lines until we see the closing ---
                           (take-while (comp not (partial re-matches #"---\s*"))))]
       [(->> yaml-lines
             ;; join together and parse
             (string/join "\n")
             yaml/parse-string)
        ;; number of lines consumed must consider opening and closing ---
        (+ (count yaml-lines) 2)])
     :cljs
     (throw (js/Error. "YAML is unsupported in ClojureScript mode"))))

(defn parse-edn-metadata-headers
  [lines-seq]
  ;; take sequences until you hit an empty line
  (let [meta-lines (take-while (comp not (partial re-matches #"\s*"))
                               lines-seq)]
    [(->> meta-lines
          ;; join together and parse
          (string/join "\n")
          edn/read-string)
     ;; count the trailing empty line
     (inc (count meta-lines))]))

(defn parse-metadata-headers
  "Given a sequence of lines from a markdown document, attempt to parse a
  metadata header if it exists. Accepts wiki, yaml, and edn formats.
   
  Returns the parsed headers number of lines the metadata spans"
  [lines-seq]
  {:pre [(sequential? lines-seq)
         (every? string? lines-seq)]}
  (cond
    ;; Treat as yaml
    (re-matches #"---\s*" (first lines-seq))
    (parse-yaml-metadata-headers lines-seq)
    ;; Treat as wiki
    (re-matches #"\w+: .*" (first lines-seq))
    (parse-wiki-metadata-headers lines-seq)
    ;; Treat as edn
    (re-matches #"\{.*" (first lines-seq))
    (parse-edn-metadata-headers lines-seq)))

(def ^:private not-a-tag-start-re
  ;; a `<` not followed by a tag name, `/`, `!` (comment, doctype) or `?`
  ;; (processing instruction) cannot begin an html tag, it is literal text
  #"<(?=[^a-zA-Z/!?]|$)")

;; the content of these elements is raw text as far as the browser is
;; concerned, so a `<` inside them is part of that markup and not prose
(def ^:private raw-html-tags ["script" "style" "pre" "textarea"])

(def ^:private raw-html-token-re #"\u0002raw-html-([0-9]+)\u0002")

(defn- raw-html-token [i]
  (str "\u0002raw-html-" i "\u0002"))

(defn- tag-boundary?
  "True when the character at `i` can follow a tag name in `lower`."
  [lower i]
  (or (>= i (count lower))
      (contains? #{">" "/" " " "\t" "\n" "\r"} (subs lower i (inc i)))))

(defn- ascii-lower-case
  "Lowercases only the ASCII letters in `text`. Unlike string/lower-case this
  never changes the length of the string (e.g. `İ` lowercases to two chars),
  so indexes found in the result are valid in `text`."
  [text]
  (string/replace text #"[A-Z]+" string/lower-case))

(defn- next-raw-open
  "Finds the earliest raw html region opening at or after `from` in the
  lowercased text `lower`. Returns [index kind], where kind is :comment or the
  tag name, or nil when there is none."
  [lower from]
  (let [comment (string/index-of lower "<!--" from)
        tags    (keep (fn [tag]
                        (let [i (string/index-of lower (str "<" tag) from)]
                          (when (and i
                                     (tag-boundary? lower (+ i 1 (count tag))))
                            [i tag])))
                      raw-html-tags)]
    (first (sort-by first (concat (when comment [[comment :comment]]) tags)))))

(defn- raw-html-regions
  "Finds the raw html regions (comments and script/style/pre/textarea
  elements) in `text` as a vector of [start end) index pairs. Returns
  [regions unclosed-marker], where unclosed-marker is the marker that closes a
  region left open at the end of the line, or nil."
  [text]
  (let [lower (ascii-lower-case text)
        n     (count lower)]
    (loop [from 0 regions []]
      (if-let [[i kind] (next-raw-open lower from)]
        (if (= :comment kind)
          (if-let [end (string/index-of lower "-->" (+ i 4))]
            (recur (+ end 3) (conj regions [i (+ end 3)]))
            [(conj regions [i n]) "-->"])
          (let [open-end (string/index-of lower ">" i)
                close    (when open-end
                           (string/index-of lower (str "</" kind) open-end))
                close-end (when close (string/index-of lower ">" close))]
            (if close-end
              (recur (inc close-end) (conj regions [i (inc close-end)]))
              [(conj regions [i n]) (str "</" kind)])))
        [regions nil]))))

(defn- mask-regions
  "Replaces each [start end) region of `text` with a placeholder token."
  [text regions]
  (loop [regions (map-indexed vector regions) pos 0 parts []]
    (if-let [[i [start end]] (first regions)]
      (recur (rest regions) end
             (conj parts (subs text pos start) (raw-html-token i)))
      (apply str (conj parts (subs text pos))))))

(defn- unmask-regions
  "Puts the `regions` (in the same order they were masked) back into `text`."
  [text regions]
  (string/replace text raw-html-token-re
                  (fn [[_ i]]
                    (nth regions (#?(:clj Long/parseLong :cljs js/parseInt) i)))))

(defn- escape-lt-chars [text]
  (string/replace text not-a-tag-start-re "&lt;"))

(defn escape-lt
  "Escapes `<` characters that cannot start an html tag so they show up as
  literal text instead of being emitted raw into the output.

  Raw html is left alone: a `<` inside a comment, script, style, pre or
  textarea is part of that markup, escaping it would change it. Those regions
  are masked while the rest of the line is escaped, and one left open at the
  end of a line keeps the following lines raw until its closing marker."
  [text {:keys [code codeblock raw-html-close] :as state}]
  (cond
    (or code codeblock)
    [text state]

    raw-html-close
    (if-let [i (string/index-of (ascii-lower-case text) raw-html-close)]
      (let [cut (+ i (count raw-html-close))]
        [(str (subs text 0 cut) (escape-lt-chars (subs text cut)))
         (dissoc state :raw-html-close)])
      [text state])

    :else
    (let [[regions unclosed] (raw-html-regions text)]
      [(if (seq regions)
         (-> (mask-regions text regions)
             escape-lt-chars
             (unmask-regions (mapv (fn [[start end]] (subs text start end))
                                   regions)))
         (escape-lt-chars text))
       (cond-> state unclosed (assoc :raw-html-close unclosed))])))

(def transformer-vector
  [set-line-state
   empty-line
   inhibit
   escape-inhibit-separator
   code
   codeblock
   escaped-chars
   inline-code
   escape-lt
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
   html-tag
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

(ns markdown.common
  (:require [clojure.string :as str]
            [clojure.string :as string])
  #?(:clj (:import (java.net URLEncoder))))

(def ^{:dynamic true} *substring*)

(def ^:dynamic *inhibit-separator* nil)

(def escape-delimiter (str (char 254) (char 491)))

(defn gen-token [n]
  (str escape-delimiter n escape-delimiter))

(defn freeze-string
  "Freezes an output string.  Converts to a placeholder token and puts that into the output.
  Returns the [text, state] pair.  Adds it into the state, the 'frozen-strings' hashmap
  So that it can be unfrozen later."
  [& args]
  (let [state (last args)
        token (gen-token (count (:frozen-strings state)))]
    [token (assoc-in state
                     [:frozen-strings token]
                     (reduce str (flatten (drop-last args))))]))

(defn thaw-string
  "Recursively replaces the frozen strings in the output with the original text."
  [text state]
  (if-let [matches (re-seq (re-pattern (str escape-delimiter "\\d+" escape-delimiter)) text)]
    (recur
      (reduce
        (fn [s r]
          (string/replace s (re-pattern r) #(get (:frozen-strings state) % %)))
        text matches)
      (update state :frozen-strings #(apply dissoc % matches)))
    [text state]))

(defn thaw-strings
  "Terminally encoded strings are ones that we've determined should no longer be processed or evaluated"
  [text state]
  (if-not (empty? (:frozen-strings state))
    (thaw-string text state)
    [text state]))

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

(def ^:private escaped-char-entities
  ;; key is the escaped-char sequence, value is the entity for the literal char
  {"\\\\" "&#92;" "\\`" "&#96;" "\\*" "&#42;" "\\_" "&#95;"
   "\\{" "&#123;" "\\}" "&#125;" "\\[" "&#91;" "\\]" "&#93;"
   "\\(" "&#40;" "\\)" "&#41;" "\\#" "&#35;" "\\+" "&#43;"
   "\\-" "&#45;" "\\." "&#46;" "\\!" "&#33;" "\\^" "&#94;"})

(defn escaped-chars [text state]
  ;; backslash escapes are literal text inside code spans, so their content
  ;; must be matched (and passed through) before looking for escape sequences
  [(if (or (:code state) (:codeblock state))
     text
     (string/replace text
                     #"`[^`]*`|\\[\\`*_{}\[\]()#+\-.!^]"
                     (fn [match]
                       (if (= \` (first match))
                         match
                         (escaped-char-entities match)))))
   state])

(defn- tag-open-after?
  "Whether an html tag is open at the end of `text`, given whether one was open
   at its start."
  [open? text]
  (let [lt (string/last-index-of text "<")
        gt (string/last-index-of text ">")]
    (if (or lt gt)
      (> (or lt -1) (or gt -1))
      open?)))

(defn- run-starts
  "The start index of every run of the character `ch` in `text` that is exactly
   `n` characters long."
  [text ch n]
  ;; (run-starts "a **b** *c ***" \* 2)  =>  [2 5]
  ;;
  ;;   a **b** *c ***
  ;;     ^^ ^^ ^  ^^^     the runs of *
  ;;     2  5  8  11      where each one starts
  ;;     2  2  1  3       how long each one is
  ;;     |  |             exactly 2 long, so kept
  (let [length (count text)]
    (loop [from 0 starts []]
      (if-let [start (string/index-of text ch from)]
        ;; `end` is one past the last `ch` of the run that starts here
        (let [end (loop [i start]
                    (if (and (< i length) (= ch (nth text i)))
                      (recur (inc i))
                      i))]
          (recur end (if (= n (- end start)) (conj starts start) starts)))
        starts))))

(defn- drop-in-tag
  "Drops the leading `starts` that are inside an html tag opened in `text` at or
   after `from`."
  [text from starts]
  ;; `in-tag?` is carried from one start to the next, so that each stretch of
  ;; the text is only looked at once
  (loop [from from in-tag? false starts starts]
    (if (and (seq starts)
             (tag-open-after? in-tag? (subs text from (first starts))))
      (recur (first starts) true (rest starts))
      starts)))

(defn make-separator
  "Return a transformer to
   - find all the chunks of the string delimited by the `separator`,
   - wrap the output with the `open` and `close` markers, and
   - apply the `chunk-transformer` to the text inside the chunk."
  ([separator open close]
   ;; a chunk-transformer takes and returns [text state], this one changes nothing
   (make-separator separator open close (fn [text state] [text state])))
  ([separator open close chunk-transformer]
   (when-not (and (seq separator) (apply = separator))
     (throw (ex-info "A separator must be one character repeated"
                     {:separator separator})))
   (let [first-sep-char (first separator)
         sep-length     (count separator)]
     (fn [text state]
       (if (:code state)
         [text state] ; No changes in code blocks
         (loop [out    []  ;the pieces of the result, joined at the end
                pos    0  ;where the text that is not in `out` yet starts
                starts (run-starts text first-sep-char sep-length)  ;the separators not used yet
                state  state]
           ;; the first two separators left are a pair, `starts` becomes the rest
           (let [[opening closing & starts] (drop-in-tag text pos starts)]
             (if closing
               (let [[chunk state] (chunk-transformer (subs text (+ opening sep-length) closing) state)]
                 (recur (conj out (subs text pos opening) open chunk close)
                        (+ closing sep-length)  ;just past the closing separator
                        starts
                        state))
               ;; a separator that is never closed stays in the text as it is
               [(string/join (conj out (subs text pos))) state]))))))))

(defn escape-code-transformer [text state]
  [(escape-code text) state])

(def strong (make-separator "**" "<strong>" "</strong>"))

(def bold-italic (make-separator "***" "<b><i>" "</i></b>"))

(def bold (make-separator "__" "<b>" "</b>"))

(def em (make-separator "*" "<em>" "</em>"))

(def italics (make-separator "_" "<i>" "</i>"))

(def strikethrough (make-separator "~~" "<del>" "</del>"))

(def inline-code (make-separator "`" "<code>" "</code>" escape-code-transformer))

(defn inhibit [text state]
  (if *inhibit-separator*
    ((make-separator *inhibit-separator* "" "" freeze-string)
     text state)
    [text state]))

(defn escape-inhibit-separator [text state]
  [(if *inhibit-separator*
     (string/replace text
                     (string/join (concat *inhibit-separator* *inhibit-separator*))
                     (string/join *inhibit-separator*))
     text)
   state])

(defn heading-text [text]
  (-> (clojure.string/replace text #"^([ ]+)?[#]+" "")
      (clojure.string/replace #"[#]+$" "")
      ;; Strip out Hugo style anchor links
      (clojure.string/replace #"\{(#|id=)?.*\}$" "")
      string/trim))

(defn hugo-anchor
  "Extract Hugo markdown anchor links from the `text`.

  See: https://gohugo.io/content-management/cross-references/#heading-ids"
  [text]
  (when-let [groups (seq (re-find #"\{(#|id=)?(.*)\}$" text))]
    (last groups)))

(defn default-anchor
  "Build a default anchor based on a heading's text content"
  [text]
  (-> text
    heading-text
    (string/replace #"\s+" "_")
    string/lower-case
    (as-> $
      #?(:clj  (URLEncoder/encode ^String $ "UTF-8")
         :cljs (js/encodeURIComponent $)))))

(defn heading-level [text]
  (let [num-hashes (count (filter #(not= \space %) (take-while #(or (= \# %) (= \space %)) (seq text))))]
    (when (pos? num-hashes) num-hashes)))

(defn make-heading [text heading-anchors]
  (when-let [heading (heading-level text)]
    (let [htext (heading-text text)
          anchor (when heading-anchors
                   (or (hugo-anchor text)
                     (default-anchor text)))]
      ;; We do not need to process the id string, HTML5 ids can contain anything except the space character.
      ;; (https://www.w3.org/TR/html5/dom.html#the-id-attribute)
      (str "<h" heading (when anchor (str " id=\"" anchor "\"")) ">"
           htext "</h" heading ">"))))

(def ^:private html-comment-re
  ;; an html comment swallows the dashes in its delimiters, they are not
  ;; typographic dashes and must not be turned into entities
  #"<!--.*?-->")

(def ^:private html-comment-token-re #"\u0002html-comment-([0-9]+)\u0002")

(defn dashes [text state]
  [(if (or (:code state) (:codeblock state))
     text
     (let [comments (atom [])
           text'    (string/replace
                     text html-comment-re
                     (fn [comment]
                       (swap! comments conj comment)
                       (str "\u0002html-comment-" (dec (count @comments)) "\u0002")))]
       (-> text'
           (string/replace #"\-\-\-" "&mdash;")
           (string/replace #"\-\-" "&ndash;")
           (string/replace #"<code>.*</code>"
                           (fn [s](-> s
                                      (string/replace #"&mdash;" "---")
                                      (string/replace #"&ndash;" "--"))))
           (string/replace #"<a href='[^']*'>"
                           (fn [s](-> s
                                      (string/replace #"&mdash;" "---")
                                      (string/replace #"&ndash;" "--"))))
           (string/replace html-comment-token-re
                           (fn [[_ n]]
                             (nth @comments (#?(:clj Long/parseLong :cljs js/parseInt) n)))))))
   state])

(ns markdown.common
  (:require [clojure.string :as string]))

(declare ^{:dynamic true} *substring*)

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

(defn make-separator
  "Return a transformer to
   - find all the chunks of the string delimited by the `separator',
   - wrap the output with the `open' and `close' markers, and
   - apply the `transformer' to the text inside the chunk."
  ([separator open close]
   (make-separator separator open close identity))
  ([separator open close transformer]
   (let [separator (seq separator)]  ;; allow char seq or string
     (fn [text state]
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
               (let [[new-buf new-state]
                     (if (identical? transformer identity)
                       ;; Skip the buf->string->buf conversions in the common
                       ;; case.
                       [buf cur-state]
                       (let [[s new-state] (transformer (string/join buf) cur-state)]
                         [(seq s) new-state]))]
                 (recur (vec (concat out (seq open) new-buf (seq close)))
                        []
                        (rest tokens)
                        (assoc new-state :found-token false)))
               (recur out
                      (into buf (first tokens))
                      (rest tokens)
                      cur-state))

             (= (first tokens) separator)
             (recur out buf (rest tokens) (assoc cur-state :found-token true))

             :default
             (recur (into out (first tokens)) buf (rest tokens) cur-state))))))))

(defn escape-code-transformer [text state]
  [(escape-code text) state])

;; Not used any more internally; kept around just in case third party code
;; depends on this.
(defn separator [escape? text open close separator state]
  ((make-separator separator open close (if escape? escape-code-transformer identity))
   text state))

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
      string/trim))

(defn heading-level [text]
  (let [num-hashes (count (filter #(not= \space %) (take-while #(or (= \# %) (= \space %)) (seq text))))]
    (if (pos? num-hashes) num-hashes)))

(defn make-heading [text heading-anchors]
  (when-let [heading (heading-level text)]
    (let [text (heading-text text)]
      ;; We do not need to process the id string, HTML5 ids can contain anything except the space character.
      ;; (https://www.w3.org/TR/html5/dom.html#the-id-attribute)
      (str "<h" heading (when heading-anchors (str " id=\"" (-> text string/lower-case (string/replace " " "&#95;")) "\"")) ">"
           text "</h" heading ">"))))

(defn dashes [text state]
  [(if (or (:code state) (:codeblock state))
     text
     (-> text
         (string/replace #"\-\-\-" "&mdash;")
         (string/replace #"\-\-" "&ndash;")))
   state])

(ns markdown.common
  (:require [clojure.string :as string]))

(declare ^{:dynamic true} *substring*)

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

(defn strikethrough [text state]
  (separator false text "<del>" "</del>" [\~ \~] state))

(defn inline-code [text state]
  (separator true text "<code>" "</code>" [\`] state))

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
      (str "<h" heading ">"
           (if heading-anchors (str "<a name=\"" (-> text string/lower-case (string/replace " " "&#95;")) "\"></a>"))
           text "</h" heading ">"))))

(defn dashes [text state]
  [(if (or (:code state) (:codeblock state))
     text
     (-> text
         (string/replace #"\-\-\-" "&mdash;")
         (string/replace #"\-\-" "&ndash;")))
   state])

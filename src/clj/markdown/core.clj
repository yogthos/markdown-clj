(ns markdown.core
  (:require [clojure.java.io :as io]
            [markdown.common
             :refer [*inhibit-separator*]]
            [markdown.links
             :refer [parse-reference-link parse-footnote-link]]
            [markdown.transformers
             :refer [transformer-vector footer parse-metadata-headers]])
  (:import [java.io BufferedReader
            BufferedWriter
            StringReader
            StringWriter
            Writer]))

(defn- write [^Writer writer ^String text]
  (doseq [c text] (.write writer (int c))))

(defn- init-transformer [writer {:keys [replacement-transformers custom-transformers inhibit-separator]}]
  (fn [line next-line state]
    (binding [*inhibit-separator* inhibit-separator]
      (let [[text new-state]
            (reduce
              (fn [[text, state] transformer]
                (transformer text (assoc state :next-line next-line)))
              [line state]
              (or replacement-transformers
                  (into transformer-vector custom-transformers)))]
        (write writer text)
        new-state))))

(defn parse-references [in]
  (let [references (map parse-reference-link (line-seq (io/reader in)))] 
    (if (instance? StringReader in)
      (.reset in))
    (into {} references)))

(defn parse-footnotes [in]
  (let [footnotes (atom {:next-fn-id 1 :processed {} :unprocessed {}})]
    (doseq [line (line-seq (io/reader in))]
      (parse-footnote-link line footnotes))
    (if (instance? StringReader in)
      (.reset in))
    @footnotes))

(defn parse-metadata [in]
  (let [lines    (line-seq (io/reader in))
        metadata-and-lines (parse-metadata-headers lines)]
    (when (instance? StringReader in)
      (.reset in))
    metadata-and-lines))

(defn parse-params
  [params]
  (when (not= 0 (mod (count params) 2))
    (throw (IllegalArgumentException.
             "Must supply an even number of parameters")))
  (when params (apply assoc {} params)))

(defn md-to-html
  "reads markdown content from the input stream and writes HTML to the provided
  output stream. If metadata was requested to be parsed it is returned, otherwise
  nil is returned."
  [in out & params]
  (binding [markdown.common/*substring* (fn [^String s n] (.substring s n))
            markdown.transformers/*formatter* clojure.core/format]
    (let [params     (parse-params params)
          references (when (:reference-links? params) (parse-references in))
          footnotes  (when (:footnotes? params) (parse-footnotes in))
          [metadata num-lines] (when (:parse-meta? params) (parse-metadata in))]
      (with-open [^BufferedReader rdr (io/reader in)
                  ^BufferedWriter wrt (io/writer out)]
        (when (and metadata (:parse-meta? params))
          (dotimes [_ num-lines]
            (.readLine rdr)))
        (let [transformer (init-transformer wrt params)]
          (loop [^String line      (.readLine rdr)
                 ^String next-line (.readLine rdr)
                 state             (merge {:last-line-empty? true
                                           :references       references
                                           :footnotes        footnotes}
                                          params)]
            (let [line  (if (:skip-next-line? state) "" line)
                  buf   (:buf state)
                  state (if buf
                          (transformer buf
                                       (:next-line state)
                                       (-> state
                                           (dissoc :buf :lists :next-line)
                                           (assoc :last-line-empty? true)))
                          state)]
              (if line
                (recur next-line
                       (.readLine rdr)
                       (assoc (transformer line next-line (dissoc state :skip-next-line?))
                         :last-line-empty? (empty? (.trim line))))
                (transformer (footer (:footnotes state)) nil (assoc state :eof true))))))
        (.flush wrt)
        metadata))))

(defn md-to-html-string*
  "converts a markdown formatted string to an HTML formatted string"
  [text params]
  (when text
    (let [input    (new StringReader text)
          output   (new StringWriter)
          metadata (apply md-to-html input output params)
          html     (.toString output)]
      {:metadata metadata :html html})))

(defn md-to-meta
  "converts a markdown formatted string to a metadata map"
  [text]
  (when text
    (let [input (new StringReader text)]
      (first (parse-metadata input)))))

(defn md-to-html-string [text & params]
  (:html (md-to-html-string* text params)))

(defn md-to-html-string-with-meta [text & params]
  (md-to-html-string* text (into [:parse-meta? true] params)))

(ns markdown.core
  (:use [markdown.transformers
         :only [*next-line* *substring* transformer-vector parse-reference parse-reference-link]])
  (:require [clojure.java.io :as io])
  (:import [java.io BufferedReader
                    BufferedWriter
                    StringReader
                    StringWriter
                    Writer]))

(defn- write [^Writer writer ^String text]
  (doseq [c text] (.write writer (int c))))

(defn- init-transformer [writer {:keys [replacement-transformers custom-transformers]}]
  (fn [line next-line state]
    (binding [*next-line* next-line]
      (let [[text new-state]
            (reduce
              (fn [[text, state] transformer]
                (transformer text state))
              [line state]
              (or replacement-transformers
                  (into transformer-vector custom-transformers)))]
        (write writer text)
        new-state))))

(defn parse-references [in]
  (let [references (atom {})]
    (if (instance? StringReader in)
      (do
        (doseq [line (line-seq (io/reader in))]
          (parse-reference-link line references))
        (.reset in))
      (doseq [line (line-seq (io/reader in))]
        (parse-reference-link line references)))
    @references))

(defn md-to-html
  "reads markdown content from the input stream and writes HTML to the provided output stream"
  [in out & params]
  (binding [markdown.transformers/*substring* (fn [^String s n] (.substring s n))
            markdown.transformers/formatter clojure.core/format]
    (let [params     (when params (apply (partial assoc {}) params))
          references (when (:reference-links? params) (parse-references in))]
      (with-open [^BufferedReader rdr (io/reader in)
                  ^BufferedWriter wrt (io/writer out)]
        (let [transformer (init-transformer wrt params)]
          (loop [^String line (.readLine rdr)
                 next-line    (.readLine rdr)
                 state        (merge {:last-line-empty? true
                                      :references       references}
                                     params)]
            (let [state (if (:buf state)
                          (transformer (:buf state)
                                       next-line
                                       (-> state (dissoc :buf :lists)
                                           (assoc :last-line-empty? true)))
                          state)]
              (if line
                (recur next-line
                       (.readLine rdr)
                       (assoc (transformer line next-line state)
                         :last-line-empty? (empty? (.trim line))))
                (transformer "" nil (assoc state :eof true))))))
        (.flush wrt)))))

(defn md-to-html-string
  "converts a markdown formatted string to an HTML formatted string"
  [text & params]
  (when text
    (let [input  (new StringReader text)
          output (new StringWriter)]
      (apply (partial md-to-html input output) params)
      (.toString output))))

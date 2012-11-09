(ns markdown
  (:use [transformers :only [transformer-list]])
  (:require [clojure.java.io :as io])
  (:import [java.io StringReader StringWriter]))

(defn- write [writer text]
  (doseq [c text] (.write writer (int c))))
 
(defn- init-transformer [writer transformers]  
  (fn [line state]    
    (let [[text new-state]
          (reduce
            (fn [[text, state] transformer]                 
              (with-redefs [transformers/substring (fn [s n] (.substring s n))]
                (transformer text state)))
            [line state]           
            transformers)]      
      (write writer text)
      new-state)))
 
(defn md-to-html 
  "reads markdown content from the input stream and writes HTML to the provided output stream"
  [in out & params]  
  (with-open [reader (io/reader in)
              writer (io/writer out)]    
    (let [transformer (init-transformer writer (transformer-list))] 
      (loop [line  (.readLine reader)
             state (apply (partial assoc {} :last-line-empty? true) params)]              
        (if line        
          (recur (.readLine reader) 
                 (assoc (transformer line state) 
                        :last-line-empty? (empty? (.trim line))))
          (transformer "" (assoc state :eof true)))))
    (.flush writer)))

(defn md-to-html-string
  "converts a markdown formatted string to an HTML formatted string"
  [text & params]  
  (when text
    (let [input (new StringReader text)
          output (new StringWriter)] 
      (apply (partial md-to-html input output) params)
      (.toString output))))

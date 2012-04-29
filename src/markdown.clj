(ns markdown
  (:use [transformers :only [transformer-list]])
  (:import [java.io 
            BufferedReader 
            FileReader 
            BufferedWriter 
            StringReader 
            StringWriter]))

(defn- write [writer text]
  (doseq [c text] (.write writer (int c))))
 
(defn- init-transformer [writer transformers]  
  (fn [line state]    
    (let [[text new-state]
          (reduce
            (fn [[text, state] transformer]                 
              (with-redefs [transformers/trim (fn [x] (.trim x))]
                (transformer text state)))
            [line state]           
            transformers)]      
      (write writer text)
      new-state)))
 
(defn md-to-html 
  "reads markdown content from the input stream and writes HTML to the provided output stream"
  [in out]    
  (with-open [reader (new BufferedReader in)
              writer (new BufferedWriter out)]    
    (let [transformer (init-transformer writer (transformer-list))] 
      (loop [line (.readLine reader)
             state {:last-line-empty? false}]              
        (if line        
          (recur (.readLine reader) 
                 (assoc (transformer line state) 
                        :last-line-empty? (empty? (.trim line))))
          (transformer "" (assoc state :eof true)))))
    (.flush writer)))

(defn md-to-html-string
  "converts a markdown formatted string to an HTML formatted string"
  [text]
  (let [input (new StringReader text)
        output (new StringWriter)] 
    (md-to-html input output)
    (.toString output)))
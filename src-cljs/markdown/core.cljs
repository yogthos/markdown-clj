(ns markdown
  (:use [markdown.transformers :only [transformer-list]]))

(defn- init-transformer [transformers]
  (fn [html line state]
    (let [[text new-state]
          (reduce
            (fn [[text, state] transformer]               
              (transformer text state))
            [line state]           
            transformers)]      
      [(str html text) new-state])))

(defn ^:export mdToHtml 
  "processes input text line by line and outputs an HTML string"
  [text]
  (let [transformer (init-transformer transformer-list)] 
      (loop [html ""
             remaining (.split text "\n")
             state {:last-line-empty? false}]              
             
        (if (empty? remaining)        
          (first (transformer html "" (assoc state :eof true)))
          (let [[new-html new-state] (transformer html (first remaining) state) ] 
          (recur new-html
                 (rest remaining) 
                 (assoc new-state :last-line-empty? (empty? (first remaining)))))))))




(ns markdown.core
  (:use [markdown.transformers :only [*substring* transformer-list]]))

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
  (binding [markdown.transformers/*substring* (fn [s n] (apply str (drop n s)))] 
    (let [transformer (init-transformer transformer-list)] 
      (loop [html ""
             remaining (.split text "\n")
             state {:last-line-empty? false}]        
        (let [[html state] 
              (if (:buf state) 
                (transformer html (:buf state) (-> state (dissoc :buf :lists) (assoc :last-line-empty? true)))           
                [html state])]
          (if (empty? remaining)        
            (first (transformer html "" (assoc state :eof true)))
            (let [[html state] (transformer html (first remaining) state) ] 
              (recur html
                     (rest remaining) 
                     (assoc state :last-line-empty? (empty? (first remaining)))))))))))




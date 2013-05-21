(ns markdown.core
  (:use [markdown.transformers
         :only [*next-line* *substring* transformer-list]]))

(defn- init-transformer [transformers]
  (fn [html line next-line state]    
    (binding [*next-line* next-line]
      (let [[text new-state]
            (reduce
              (fn [[text state] transformer]               
                (transformer text state))
              [line state]           
              transformers)]
        (.append html text)
        new-state))))

(defn ^:export mdToHtml 
  "processes input text line by line and outputs an HTML string"
  [text & params]
  (binding [markdown.transformers/*substring* (fn [s n] (apply str (drop n s)))] 
    (let [transformer (init-transformer transformer-list)
          html        (goog.string.StringBuffer. "")] 
      (loop [[line & more] (.split text "\n")
             state (apply (partial assoc {} :last-line-empty? false) params)]        
        (let [state 
              (if (:buf state) 
                (transformer html 
                             (:buf state)
                             (first more)
                             (-> state (dissoc :buf :lists) (assoc :last-line-empty? true)))           
                state)]
          (if (first more)
            (recur more 
                   (assoc (transformer html line (first more) state) 
                          :last-line-empty? (empty? line)))
            (transformer html line "" (assoc state :eof true)))))
      (.toString html))))

(ns transformers
  (:require [clojure.string :as string]))

(defn- trim [text]
  (apply str (take-while (partial not= \space) (drop-while (partial = \space) text))))

(defn- empty-line-transformer [text state]
  [text (if (empty? (trim text)) (dissoc state :hr :heading) state)])

(defn- separator-transformer [text, open, close, separator, state]
  (if (:code state)
    [text, state]
    (loop [out []
           buf []
           tokens (partition-by (partial = (first separator)) (seq text))
           cur-state (assoc state :found-token false)]
      (cond
        (empty? tokens)
        [(apply str (into (if (:found-token cur-state) (into out separator) out) buf))
         (dissoc cur-state :found-token)]
       
        (:found-token cur-state)
        (if (= (first tokens) separator)      
          (recur (into out (concat (seq open) buf (seq close)))
                 []
                 (rest tokens)
                 (assoc cur-state :found-token false))
          (recur out
                 (into buf (first tokens))
                 (rest tokens)
                 cur-state))
    
        (= (first tokens) separator)
        (recur out, buf, (rest tokens), (assoc cur-state :found-token true))
     
        :default
        (recur (into out (first tokens)), buf, (rest tokens), cur-state)))))
        

(defn bold-transformer [text, state]
  (separator-transformer text, "<b>", "</b>", [\* \*], state))

(defn alt-bold-transformer [text, state]
  (separator-transformer text, "<b>", "</b>", [\_ \_], state))

(defn em-transformer [text, state]
  (separator-transformer text, "<em>", "</em>", [\*], state))

(defn italics-transformer [text, state]
  (separator-transformer text, "<i>", "</i>", [\_], state))

(defn inline-code-transformer [text, state]
  (separator-transformer text, "<code>", "</code>", [\`], state))

(defn strikethrough-transformer [text, state]
  (separator-transformer text, "<del>", "</del>", [\~ \~], state))

(defn superscript-transformer [text, state]
  (if (:code state)
    [text, state]
    (let [tokens (partition-by (partial contains? #{\^ \space}) text)]
      (loop [buf []             
             remaining tokens]
        (cond 
          (empty? remaining)
          [(apply str buf), state]
          
          (= (first remaining) [\^])
          (recur (into buf (concat (seq "<sup>") (second remaining) (seq "</sup>")))                 
                 (drop 2 remaining))
          
          :default
          (recur (into buf (first remaining)) (rest remaining)))))))

(defn heading-transformer [text, state]
  (if (:code state)
    [text, state]
    (let [num-hashes (count (take-while (partial = \#) (seq text)))]    
    (if (pos? num-hashes)   
      [(str "<h" num-hashes ">" (apply str (drop num-hashes text)) "</h" num-hashes ">") (assoc state :heading true)]
      [text state]))))

(defn paragraph-transformer [text, state]    
  (if (or (:heading state) (:hr state) (:code state) (:list state) (:blockquote state))
    [text, state]
    (cond
      (:paragraph state)     
      (if (or (:eof state) (empty? (trim text)))
        [(str text "</p>"), (assoc state :paragraph false)]
        [text, state])
     
      (and (not (:eof state)) (:last-line-empty? state))
      [(str "<p>" text), (assoc state :paragraph true)]
     
      :default
      [text, state])))
      
(defn code-transformer [text, state]  
  (if (:codeblock state)
    [text, state]
    (cond         
    (:code state)
    (if (or (:eof state) (empty? (trim text)))
      ["</code></pre>", (assoc state :code false)]      
      [(str "\n" text), state])
    
    (empty? (trim text)) 
    [text, state]
    
    :default
    (let [num-spaces (count (take-while (partial = \space) text))]
      (if (> num-spaces 3)
        [(str "<pre><code>" text), (assoc state :code true)]
        [text, state])))))      


(defn codeblock-transformer [text, state]  
  (let [trimmed (trim text)] 
    (cond
      (and (= [\`\`\`] (take 3 trimmed)) (:codeblock state))
      [(str "</code></pre>" (apply str (drop 3 trimmed))), (assoc state :code false :codeblock false)]
      
      (and (= [\`\`\`] (take-last 3 trimmed)) (:codeblock state))
      [(str "</code></pre>" (apply str (drop-last 3 trimmed))), (assoc state :code false :codeblock false)]
      
      (= [\`\`\`] (take 3 trimmed))
      [(str "<pre><code>\n" (apply str (drop 3 trimmed))), (assoc state :code true :codeblock true)]
            
    (:codeblock state)
    [(str "\n" text), state]
    :default
    [text, state])))

(defn hr-transformer [text, state]
  (if (:code state) 
    [text, state]
    (let [trimmed (trim text)] 
      (if (or (= "***" trimmed)
              (= "* * *" trimmed)
              (= "*****" trimmed)
              (= "- - -" trimmed))
        [(str "<hr/>") (assoc state :hr true)]
        [text state]))))        


(defn blockquote-transformer [text, state]
  (if (or (:code state) (:list state))
    [text, state]
    (cond
      (:blockquote state)
      (if (or (:eof state) (empty? (trim text)))
        ["</p></blockquote>", (assoc state :blockquote false)]
        [text, state])
      
      :default
      (if (= \> (first text))
        [(str "<blockquote><p>" (apply str (rest text))), (assoc state :blockquote true)]
        [text, state]))))

(defn- fix-special-chars [str]
  (-> str
    (string/replace #"\*" "&#42;")
    (string/replace #"\^" "&#94;")
    (string/replace #"\_" "&#95;")
    (string/replace #"\~" "&#126;")))

(defn link-transformer [text, state]
  (if (:code state)
    [text, state]
    (loop [out []
           tokens (seq text)]
      (if (empty? tokens)
        [(apply str out) state]
                
        (let [[head, xs] (split-with (partial not= \[) tokens)
              [title, ys] (split-with (partial not= \]) xs)
              [dud, zs] (split-with (partial not= \() ys)
              [link, tail] (split-with (partial not= \)) zs)]
          
          [(count title) (count link)]
          (if (or (< (count title) 2) 
                  (< (count link) 2)
                  (< (count tail) 1))
            (recur (concat out head title dud link), tail)
            (recur 
              (into out
                    (fix-special-chars
                      (apply str
                             (if (= (last head) \!)
                               (let [alt (rest title)
                                     [url title] (split-with (partial not= \space) (rest link))
                                     title (apply str (rest title))]                                   
                                 (concat   
                                   (butlast head)  (seq "<img src=\"") url  (seq "\" alt=\"") alt 
                                   (if (not-empty title)
                                     (seq (apply str "\" title=" title " />"))
                                     (seq "\" />"))))
                               (apply str (concat head (seq "<a href='") (rest link) (seq "'>") (rest title) (seq "</a>")))))))
              (rest tail))))))))

(defn- close-list [list-name indents]
  (if (pos? indents) 
    (apply str (for [i (range indents)] (str "</li></" list-name ">")))
    (str "</li></" list-name ">")))

(defn- list-row-helper [text state list-type indents]    
  (let [list-name (if list-type (name list-type) nil)
        total-indents (:list-indents state)
        lists (or (:lists state) '())
        last-list-type (first lists)        
        text-string (apply str text)] 
    
    (cond
      (or (empty? lists) (> indents total-indents))
      [(str "<" list-name "><li>" text-string)
         (assoc state :lists (conj lists list-type))]
      
      (not= list-type last-list-type)
      (let [lists-to-close (take-while (partial = last-list-type) lists)]        
        [(str (apply str (for [l lists-to-close] (close-list (name l) 1))) "<li>" text-string)
         (assoc state :lists (drop (count lists-to-close) lists))])
      
      :default
      (cond         
        (< indents total-indents) 
        (let [num-closed (- total-indents indents)] 
          [(str
             (apply str (for [l (take num-closed lists)] (close-list (name l) 1)))             
             "</li><li>" text-string)
           (assoc state :lists (drop num-closed lists))])
        
        :default 
        [(str "</li><li>" text-string), state]))))

(defn list-transformer [text, state]  
  (if (:code state)
    [text, state]
    (let [[spaces, remaining-text] (split-with (partial = \space) text)
          num-indents (count spaces)
          {cur-lists :lists, list-indents :list-indents, eof? :eof} state
          lists (or cur-lists '())]
      
          (cond
            ;ol
            (re-matches #"[0-9]+" (apply str (take-while (partial not= \.) remaining-text)))
            (let [actual-text (rest (drop-while (partial not= \.) remaining-text))
                  [new-text, new-state] (list-row-helper actual-text state :ol num-indents)]
              [new-text, (assoc new-state :list-indents num-indents)])
            
            ;ul
            (= [\* \space] (take 2 remaining-text))
            (let [actual-text (drop 2 remaining-text)
                  [new-text, new-state] (list-row-helper  actual-text state :ul num-indents)]
              [new-text, (assoc new-state :list-indents num-indents)])
            
            :default
            (cond
              
              (:lists state)
              [(str (apply str (for [l (:lists state)]
                (close-list (name l) 1))) text)
               (dissoc state :lists :list-indents)]
                            
              :default
              [text state])))))


(defn transformer-list []
  [empty-line-transformer
   codeblock-transformer
   code-transformer
   link-transformer
   hr-transformer
   inline-code-transformer                        									                        
   list-transformer    
   heading-transformer                      
   italics-transformer                      
   em-transformer
   bold-transformer
   alt-bold-transformer                      
   strikethrough-transformer
   superscript-transformer                         
   blockquote-transformer
   paragraph-transformer])
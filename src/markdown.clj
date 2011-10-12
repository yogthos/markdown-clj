(ns markdown
  (:import [java.io BufferedReader FileReader BufferedWriter]))

(defn- write [writer text]
  (doseq [c text] (.write writer (int c))))
 
(defn- init-transformer [writer & transformers]
  (fn [line state]
    (let [[text new-state]
          (reduce
            (fn [[text, state] transformer] (transformer text state))
            [line state]           
            transformers)]      
      (write writer text)
      new-state)))
 
(defn- bold-transformer [text, state]
  (if (:code state) 
    [text, state]
    (loop [out []
           buf []
           tokens (partition-by (partial = \*) (seq text))
           cur-state (assoc state :found-token false)]
      (cond
        (empty? tokens)
        [(apply str (into (if (:found-token cur-state) (into out [\* \*]) out) buf)), cur-state]
        
        (:found-token cur-state)
        (if (= (first tokens) [\* \*])
          (recur (into out (flatten [\< \b \> buf \< \/ \b \>]))
                 []
                 (rest tokens)
                 (assoc cur-state :found-token false))
          (recur out
                 (into buf (first tokens))
                 (rest tokens)
                 cur-state))
        
        (= (first tokens) [\* \*])
        (recur out, buf, (rest tokens), (assoc cur-state :found-token true))
     
        :default
        (recur (into out (first tokens)), buf, (rest tokens), cur-state)))))
 
(defn- italics-transformer [text, state]
  (if (:code state)
    [text, state]
    (loop [out []
           buf []
           tokens (partition-by (partial = \*) (seq text))
           cur-state (assoc state :found-token false)]
      (cond
        (empty? tokens)
        [(apply str (into (if (:found-token cur-state) (conj out \*) out) buf)), cur-state]
        
        (:found-token cur-state)
        (if (= (first tokens) [\*])
          (recur (into out (flatten [\< \i \> buf \< \/ \i \>]))
                 []
                 (rest tokens)
                 (assoc cur-state :found-token false))
          (recur out
                 (into buf (first tokens))
                 (rest tokens)
                 cur-state))
     
      (= (first tokens) [\*])
      (recur out, buf, (rest tokens), (assoc cur-state :found-token true))
     
      :default
      (recur (into out (first tokens)), buf, (rest tokens), cur-state)))))
 
(defn- heading-transformer [text, state]
  (if (:code state)
    [text, state]
    (let [num-hashes (count (take-while (partial = \#) (seq text)))]    
    (if (pos? num-hashes)   
      [(str "<h" num-hashes ">" (apply str (drop num-hashes text)) "</h" num-hashes ">"), state]
      [text, state]))))

(defn- inline-code-transformer [text, state]
  (if (:code state)
    [text, state]
    (loop [out []
           buf []
           tokens (partition-by (partial = \`) (seq text))
           cur-state (assoc state :found-token false)]
      (cond
        (empty? tokens)
        [(apply str (into (if (:found-token cur-state) (conj out \`) out) buf)), cur-state]
        
        (:found-token cur-state)
        (if (= (first tokens) [\`])
          (recur (into out (flatten [\< \p \r \e \> buf \< \/ \p \r \e \>]))
                 []
                 (rest tokens)
                 (assoc cur-state :found-token false))
          (recur out
                 (into buf (first tokens))
                 (rest tokens)
                 cur-state))
     
      (= (first tokens) [\`])
      (recur out, buf, (rest tokens), (assoc cur-state :found-token true))
     
      :default
      (recur (into out (first tokens)), buf, (rest tokens), cur-state)))))

(defn- code-transformer [text, state]  
  (cond 
        
    (:code state)
    (if (or (:eof state) (empty? (.trim text)))
      ["</pre>", (assoc state :code false)]      
      [(str "\n" text), state])
    
    (empty? (.trim text)) 
    [text, state]
    
    :default
    (let [num-spaces (count (take-while (partial = \space) text))]
      (if (> num-spaces 3)
        [(str "<pre>" text), (assoc state :code true)]
        [text, state]))))

(defn- hr-transformer [text, state]
  (if (:code state) 
    [text, state]
    (if (= "***" text)
        [(str "<hr/>"), state]
        [text, state])))


(defn- list-transformer [text, state]
  (if (:code state)
    [text, state]
    (cond
      (= [\* \space] (take 2 text))
      (if (:list state)
        [(str "<li>" (apply str (drop 2 text)) "</li>"), state]
        [(str "<ul><li>" (apply str (drop 2 text)) "</li>"), (assoc state :list true)])
      
      (and (:list state) (or (:eof state) (empty? (.trim text))))
      ["</ul>", (assoc state :list false)]
      
      :default
      [text, state])))

(defn- paragraph-transformer [text, state]  
  (if (or (:code state) (:list state) (:blockquote state))
    [text, state]
    (cond
      (:paragraph state)      
      (if (or (:eof state) (empty? (.trim text)))
        ["</p>", (assoc state :paragraph false)]
        [text, state])
      
      (and (not (:eof state)) (empty? (.trim text)))
      [(str "<p>" text), (assoc state :paragraph true)]
      
      :default
      [text, state])))

(defn- blockquote-transformer [text, state]
  (if (or (:code state) (:list state))
    [text, state]
    (cond
      (:blockquote state)
      (if (or (:eof state) (empty? (.trim text)))
        ["</p></blockquote>", (assoc state :blockquote false)]
        [text, state])
      
      :default
      (if (= \> (first text))
        [(str "<blockquote><p>" (apply str (rest text))), (assoc state :blockquote true)]
        [text, state]))))


(defn markdown-to-html 
  "reads markdown content from the input stream and writes HTML to the provided output stream"
  [in out]    
  (with-open [reader (new BufferedReader in)
              writer (new BufferedWriter out)]    
    (let [transformer (init-transformer 
                        writer
                        inline-code-transformer
                        code-transformer
                        hr-transformer
                        heading-transformer
                        italics-transformer
                        bold-transformer
                        list-transformer
                        blockquote-transformer
                        paragraph-transformer)] 
      (loop [line (.readLine reader)
             state {}]              
      (if line        
        (recur (.readLine reader) (transformer line state))
        (transformer "" (assoc state :eof true)))))
    (.flush writer)))
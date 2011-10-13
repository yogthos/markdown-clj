(ns markdown
  (:import [java.io 
            BufferedReader 
            FileReader 
            BufferedWriter 
            StringReader 
            StringWriter]))

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
 
(defn- separator-transformer [text, open, close, separator, state]
  (if (:code state) 
    [text, state]
    (loop [out []
           buf []
           tokens (partition-by (partial = (first separator)) (seq text))
           cur-state (assoc state :found-token false)]
      (cond
        (empty? tokens)
        [(apply str (into (if (:found-token cur-state) (into out separator) out) buf)), cur-state]
        
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

(defn- bold-transformer [text, state]
  (separator-transformer text, "<b>", "</b>", [\* \*], state))

(defn- alt-bold-transformer [text, state]
  (separator-transformer text, "<b>", "</b>", [\_ \_], state))

(defn- italics-transformer [text, state]
  (separator-transformer text, "<i>", "</i>", [\*], state))

(defn- alt-italics-transformer [text, state]
  (separator-transformer text, "<i>", "</i>", [\_], state))

(defn- inline-code-transformer [text, state]
  (separator-transformer text, "<code>", "</code>", [\`], state))

(defn- strikethrough-transformer [text, state]
  (separator-transformer text, "<del>", "</del>", [\~ \~], state))

(defn- superscript-transformer [text, state]
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

(defn- heading-transformer [text, state]
  (if (:code state)
    [text, state]
    (let [num-hashes (count (take-while (partial = \#) (seq text)))]    
    (if (pos? num-hashes)   
      [(str "<h" num-hashes ">" (apply str (drop num-hashes text)) "</h" num-hashes ">"), state]
      [text, state]))))

(defn- code-transformer [text, state]  
  (cond 
        
    (:code state)
    (if (or (:eof state) (empty? (.trim text)))
      ["</code></pre>", (assoc state :code false)]      
      [(str "\n" text), state])
    
    (empty? (.trim text)) 
    [text, state]
    
    :default
    (let [num-spaces (count (take-while (partial = \space) text))]
      (if (> num-spaces 3)
        [(str "<pre><code>" text), (assoc state :code true)]
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
    (let [[spaces, remaining-text] (split-with (partial = \space) text)
          actual-text (drop 2 remaining-text)
          num-indents (count spaces)]          
      (cond
        (= [\* \space] (take 2 remaining-text))
        (if (:list state)             
          (cond            
            (nil? (:list-indents state))
            [(str "<li>" (apply str actual-text))
             (assoc state :list-indents num-indents)]
            
            (< num-indents (:list-indents state))
            [(str (apply str
                         (for [i (range (- (:list-indents state) num-indents))]
                           "</li></ul></li><li>"))                   
                  (apply str actual-text))
             (assoc state :list-indents num-indents)]
            
            (> num-indents (:list-indents state))
            [(str "<ul><li>" (apply str actual-text))
             (assoc state :list-indents num-indents)]
            
            (= num-indents (:list-indents state))
            [(str "</li><li>" (apply str actual-text)), state]
            
            :default
            [(str "<li>" (apply str actual-text)), state])
          
          [(str "<ul><li>" (apply str (drop 2 text))),
           (assoc state :list true :list-indents num-indents)])
        
        (and (:list state) (or (:eof state) (empty? (.trim text))))
        [(if (< (:list-indents state) 1)
           (str text "</li></ul>")
           (str text (apply str (for [i (range (:list-indents state))] "</li></ul>"))))
         (assoc state :list false)]
        
        :default
        [text, state]))))

(defn- paragraph-transformer [text, state]  
  (if (or (:code state) (:list state) (:blockquote state))
    [text, state]
    (cond
      (:paragraph state)     
      (if (or (:eof state) (empty? (.trim text)))
        [(str text "</p>"), (assoc state :paragraph false)]
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

(defn- link-transformer [text, state]
  (if (:code state)
    [text, state]
    (loop [out []
           tokens (seq text)]
      (if (empty? tokens)
        [(apply str out), state]
                
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
              (concat out head (seq "<a href='") (rest link) (seq "'>") (rest title) (seq "</a>"))
              (rest tail))))))))

(defn md-to-html 
  "reads markdown content from the input stream and writes HTML to the provided output stream"
  [in out]    
  (with-open [reader (new BufferedReader in)
              writer (new BufferedWriter out)]    
    (let [transformer (init-transformer 
                        writer
                        inline-code-transformer
                        code-transformer
                        list-transformer                        
                        hr-transformer
                        heading-transformer
                        italics-transformer
                        alt-italics-transformer
                        bold-transformer    
                        alt-bold-transformer
                        strikethrough-transformer
                        superscript-transformer
                        link-transformer
                        blockquote-transformer
                        paragraph-transformer)] 
      (loop [line (.readLine reader)
             state {}]              
      (if line        
        (recur (.readLine reader) (transformer line state))
        (transformer "" (assoc state :eof true)))))
    (.flush writer)))

(defn md-to-html-string
  "converts a markdown formatted string to an HTML formatted string"
  [text]
  (let [input (new StringReader text)
        output (new StringWriter)] 
    (md-to-html input output)
    (.toString output)))

;(md-to-html (new FileReader "small_text.txt") *out*)
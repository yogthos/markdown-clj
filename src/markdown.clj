(ns markdown
  (:import [java.io BufferedReader FileReader BufferedWriter]))

(defn- write [writer text]
  (doseq [c text] (.write writer (int c))))


(defn- transform [writer c transformers]  
  (let [cur-char (if (pos? c) (char c) \newline)
        result (doall
                 (for [transformer transformers]         
                   (transformer writer cur-char (neg? c))))]    

    (when (not (contains? #{\* \# \` \>} cur-char))
      (write writer (str cur-char)))
    result))


(defn- italics-transformer 
  ([] (italics-transformer {:italics false, :stars 0, :previous nil, :newline true}))  
  ([{italics? :italics, stars :stars, previous :previous, newline? :newline}]    
    (fn [writer c eof?]             
      (italics-transformer 
        (condp = c 
          \*
          {:italics italics?, :stars (inc stars), :previous c, :newline newline?}
          
          \newline
          (do 
            (when (and italics? (= stars 1))
              (write writer "</i>"))
            {:italics false, :stars 0, :previous c, :newline true})
 
          ;default          
          (cond
            (and newline? (= previous \*) (= \space c))
            {:italics false, :stars 0, :previous c, :newline false}
          
            (and (= stars 1) italics?)
            (do
              (write writer "</i>")
              {:italics false, :stars 0, :previous c, :newline false})
            
            (= stars 1)
            (do
              (write writer "<i>")
              {:italics true, :stars 0, :previous c, :newline false})
           
            :default
            {:italics italics?, :stars 0, :previous c, :newline false}))))))


(defn- bold-transformer 
  ([] (bold-transformer {:bold false, :stars 0, :previous nil}))
  ([{bold? :bold, stars :stars, previous :previous}]
    (fn [writer c eof?]             
      (bold-transformer 
        (if (= \* c)           
          {:bold bold?, :stars (inc stars)}
                              
          (cond
            (and (= stars 2) bold?)
            (do
              (write writer "</b>")
              {:bold false, :stars 0})
            
            (and (= stars 2) (not bold?))
            (do
              (write writer "<b>")
              {:bold true, :stars 0})
           
            :default
            {:bold bold?, :stars 0}))))))


(defn- heading-transformer 
  ([] (heading-transformer {:heading false, :start-of-line true, :hashes 0}))
  ([{heading? :heading, start-of-line? :start-of-line, hashes :hashes}]
    (fn [writer c eof?]
      (heading-transformer
        (condp = c
          \#
          {:heading heading?, :start-of-line start-of-line?, :hashes (if start-of-line?(inc hashes) 0)}
          
          \newline
          (do 
            (when heading? 
              (write writer (str "</h" hashes ">")))
            {:heading false, :start-of-line true, :hashes 0})
          
          (cond 
            (and start-of-line? (> hashes 0) (not heading?))
            (do 
              (write writer (str "<h" hashes ">"))
              {:heading true, :start-of-line false, :hashes hashes})
            
            :default 
            {:heading heading?, :hashes hashes}))))))


(defn- hr-transformer 
  ([] (hr-transformer {:stars 0, :previous nil}))
  ([{stars :stars, previous :previous}]
    (fn [writer c eof?]
      (hr-transformer
        (condp = c 
          \*
          (if (= \* previous) 
            {:stars (inc stars), :previous c}
            {:stars 1, :previous c})
          
          \newline
          (do            
            (when (= stars 3)
              (write writer "<hr/>"))
            {:stars 0, :previous c})
          
          ;default
          {:stars stars, :previous c})))))

(defn- paragraph-transformer 
  ([] (paragraph-transformer {:empty-line true, :last-line-empty true, :paragraph false, :leading-spaces 0}))
  ([{empty-line? :empty-line, last-line-empty? :last-line-empty, paragraph? :paragraph, leading-spaces :leading-spaces}]
    (fn [writer c eof?]
      (paragraph-transformer
        (condp = c
          \newline
          (cond             
            (and (or eof? empty-line?) paragraph?)            
            (do
              (write writer "</p>")
              {:empty-line true, :last-line-empty true, :paragraph false, :leading-spaces 0})
            
            empty-line?            
            {:empty-line true, :last-line-empty true, :paragraph paragraph?, :leading-spaces 0}
                        
            :default
            {:empty-line true, :last-line-empty false, :paragraph paragraph?, :leading-spaces 0})
          
          \space
          {:empty-line empty-line? 
           :last-line-empty last-line-empty? 
           :paragraph paragraph?
           :leading-spaces (if empty-line? (inc leading-spaces) 0)}
          
          (cond
            (and last-line-empty? empty-line? (< leading-spaces 3) (not (contains? #{\> \*} c)))
            (do
              (write writer "<p>")
              {:empty-line false, :last-line-empty true, :paragraph true, :leading-spaces leading-spaces})
            
            :default
            {:empty-line false, :last-line-empty last-line-empty?, :paragraph paragraph?, :leading-spaces leading-spaces}))))))


(defn- code-transformer 
  ([] (code-transformer {:code false, :quotes 0}))
  ([{code? :code, quotes :quotes}]
    (fn [writer c eof?]             
      (code-transformer 
        (if (= \` c)           
          {:code code?, :quotes (inc quotes)}
                              
          (cond
            (and code? (= quotes 1))
            (do
              (write writer "</pre>")
              {:code false, :quotes 0})
            
            (= quotes 1)
            (do
              (write writer "<pre>")
              {:code true, :quotes 0})
           
            :default
            {:code code?, :quotes 0}))))))


(defn- indented-code-transformer 
  ([] (indented-code-transformer {:code false, :indents 0, :empty-line true}))
  ([{code? :code, indents :indents, empty-line? :empty-line}]
    (fn [writer c eof?] 
      (indented-code-transformer
        (condp = c        
          \newline 
          (if (and code? (or eof? empty-line?))
            (do
              (write writer "</pre>")
              {:code false, :indents 0, :empty-line true})
            {:code code?, :indents 0, :empty-line true})
          
          \space
          (if empty-line?
            {:code code?, :indents (inc indents), :empty-line true}
            {:code code?, :indents indents, :empty-line false})
          
          ;default
          (cond 
            (and (not code?) (> indents 3))
            (do 
              (write writer "<pre>    ")
              {:code true, :indents 0, :empty-line? false})
            
            :default
            {:code code?, :indents 0, :empty-line? false}))))))

(defn- blockquote-transformer 
  ([] (blockquote-transformer {:quote false, :new-line true, :empty-line true}))
  ([{quote? :quote, new-line? :new-line, empty-line? :empty-line}]
    (fn [writer c eof?]
      (blockquote-transformer
        (condp = c
          \>
          (if new-line?
            (do
              (write writer "<blockquote><p>")
              {:quote true, :new-line new-line?, :empty-line false})
            {:quote quote?, :new-line new-line?, :empty-line false})
          
          \newline
          (if (and quote? (or eof? empty-line?))
            (do 
              (write writer "</p></blockquote>")
              {:quote false, :new-line true, :empty-line true})
            {:quote quote?, :new-line true, :empty-line true})
          
          {:quote quote?, :new-line false, :empty-line false})))))

(defn- list-transformer 
  ([] (list-transformer {:ul false, :first-char nil, :second-char nil, :empty-line true}))
  ([{ul? :ul, first-char :first-char, second-char :second-char, empty-line? :empty-line}]
    (fn [writer c eof?]
      (list-transformer
        (condp = c
          \*
          {:ul ul?, :first-char (or first-char \*), :second-char second-char, :empty-line empty-line?}
          
          \space
          {:ul ul?, :first-char first-char, :second-char (or second-char \space), :empty-line empty-line?}
          
          \newline
          (cond
            (and ul? (or empty-line? eof?)) 
            (do
              (write writer "</li>\n</ul>")
              {:ul false, :first-char nil, :second-char nil, :empty-line true})
            
            (and (not empty-line?) ul?)
            (do
              (write writer "</li>")
              {:ul true, :first-char nil, :second-char nil, :empty-line true})
                        
            :default
            {:ul false, :first-char nil, :second-char nil, :empty-line true})
          
          ;default
          (cond
            (and (= first-char \*) (= second-char \space) empty-line?)
            (do
              (write writer (if ul? "<li>" "<ul>\n<li>"))
              {:ul true, :first-char first-char :second-char second-char, :empty-line false})
            
            :default
            {:ul ul?, :first-char first-char :second-char second-char, :empty-line false}))))))

;;TODO links, nested lists

(defn process-stream [in out]    
  (with-open [reader (new BufferedReader in)
              writer (new BufferedWriter out)]    
    (loop [c (.read reader)
           transformers [(italics-transformer)
                         (bold-transformer)
                         (heading-transformer)
                         (hr-transformer)
                         (blockquote-transformer)
                         (paragraph-transformer)
                         (code-transformer)
                         (indented-code-transformer)
                         (list-transformer)]]
      
      (let [state (transform writer c transformers)] 
        (when (> c 0)        
          (recur
            (.read reader) state))))
    (.flush writer)))

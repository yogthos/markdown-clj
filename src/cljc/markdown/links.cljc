(ns markdown.links
  (:require [clojure.string :as string]
            [markdown.common
             :refer
             [freeze-string
              gen-token
              strong
              bold
              em
              italics
              strikethrough]]))

(defn href [text link state]
  (let [[link title] (split-with (partial not= \space) link)]
    (freeze-string
     (seq "<a href='") link (seq "'")
     (if (not-empty title)
       (seq (apply str " title=" (string/join (rest title)) ">"))
       (seq ">"))
     text (seq "</a>") state)))

(defn img [alt url state & [title]]
  (freeze-string
    (seq "<img src=\"") url (seq "\" alt=\"") alt
    (if (not-empty title)
      (seq (apply str "\" title=" (string/join title) " />"))
      (seq "\" />"))
    state))

(defn handle-img-link [xs state]
  (if (= [\[ \! \[] (take 3 xs))
    (let [xs (drop 3 xs)
          [alt xy] (split-with (partial not= \]) xs)
          [url-title zy] (->> xy (drop 2) (split-with (partial not= \))))
          [url title] (split-with (partial not= \space) url-title)
          [new-text new-state] (img alt url state (not-empty title))]
      [(concat "[" new-text (rest zy)) new-state])
    [xs state]))

(defn process-link-title [title state]
  (first
    (reduce
      #(apply %2 %1)
      [title state]
      [italics em strong bold strikethrough])))

(defn make-link
  [img?]
  (fn link [text {:keys [code codeblock] :as state}]
    (if (or code codeblock)
      [text state]
      (loop [out []
             tokens (seq text)
             loop-state state]
        (if (empty? tokens)
          [(string/join out) loop-state]
          (let [[head xs] (split-with (partial not= \[) tokens)
                ;; Overwriting the loop-state here
                [xs loop-state] (handle-img-link xs loop-state)
                [title ys] (split-with (partial not= \]) xs)
                [dud zs] (split-with (partial not= \() ys)
                [link tail] (split-with (partial not= \)) zs)]

            (if (or (< (count link) 2)
                    (< (count tail) 1)
                    (> (count dud) 1))
              (recur (concat out head (process-link-title title state) dud link) tail loop-state)
              ;; Process a normal A anchor
              (cond
                (and (not img?) (not= (last head) \!))
                (let [[link-text new-loop-state] (href (rest (process-link-title title state)) (rest link) loop-state)]
                  (recur (concat out head link-text) (rest tail) new-loop-state))
                (and img? (= (last head) \!))
                (let [alt (rest title)
                      [url title] (split-with (partial not= \space) (rest link))
                      title (process-link-title (string/join (rest title)) loop-state)
                      ;; Now process / generate the img data
                      [img-text new-loop-state] (img alt url loop-state title)]
                  (recur (concat out (butlast head) img-text) (rest tail) new-loop-state))
                :else [(string/join (concat out tokens)) loop-state]))))))))

(def link (make-link false))
(def image (make-link true))

(defn reference [text]
  (re-find #"^\[[a-zA-Z0-9 \-_\.]+\]:" text))

(defn parse-reference [reference start]
  (-> reference
      (subs start)
      (string/trim)
      (string/split #"\s+" 2)))

(defn parse-reference-link [line references]
  (let [trimmed (string/trim line)]
    (when-let [link (reference trimmed)]
      (swap! references assoc (subs link 0 (dec (count link)))
             (parse-reference trimmed (inc (count link)))))))

(defn replace-reference-link [references reference]
  (let [[title id] (string/split reference #"\]\s*" 2)
        [link alt] (get references id)]
    (str "<a href='" link "'" (when alt (str " title='" (subs alt 1 (dec (count alt))) "'")) ">" (subs title 1) "</a>")))

(defn encode-links [links i]
  (second
    (reduce
      (fn [[i encoded] link]
        [(inc i) (assoc encoded (gen-token i) link)])
      [i {}]
      links)))

(defn parse-links [references links]
  (into {} (map
             (fn [[k v]]
               [k (replace-reference-link references v)])
             links)))

(defn freeze-links [references text state]
  (let [links
        (re-seq
          #"\[[^\]]+\]\s*\[[a-zA-Z0-9 \-_\.]+\]"
          text)
        encoded-links
        (encode-links links ((fnil count []) (:frozen-strings state)))]
    [(reduce
       (fn [s [id link]]
         (string/replace s link id))
       text encoded-links)
     (update state :frozen-strings merge (parse-links references encoded-links))]))

(defn reference-link [text {:keys [code codeblock references] :as state}]
  (cond
    (or (nil? references) code codeblock)
    [text state]

    (reference (string/trim text))
    ["" state]

    :else
    (freeze-links references text state)))

(defn implicit-reference-link [text state]
  (let [replacement-text (string/replace text #"\[([^\]]+)\]\[\]" "[$1][$1]")]
    [replacement-text state]))

(defn footnote [text]
  (re-find #"^\[\^[a-zA-Z0-9_-]+\]:" text))

(defn parse-footnote-link [line footnotes]
  (let [trimmed (string/trim line)]
    (when-let [link (footnote trimmed)]
      (swap! footnotes assoc-in [:unprocessed (subs link 0 (dec (count link)))]
             (parse-reference trimmed (inc (count link)))))))

(defn replace-footnote-link [footnotes footnote]
  (let [next-fn-id (:next-fn-id footnotes)
        link (str "#fn-" next-fn-id)]
    (str "<a href='" link "' id='fnref" next-fn-id "'><sup>" next-fn-id "</sup></a>")))

(defn replace-all-footnote-links [text {:keys [footnotes] :as state}]
  (let [matcher #"\[\^[a-zA-Z0-9_-]+\]"
        match (re-find matcher text)]
    (if (nil? match)
      [text state]
      (let [next-text (string/replace-first text matcher (partial replace-footnote-link footnotes))
            next-state (-> state
                           (update-in [:footnotes :next-fn-id] inc)
                           (assoc-in [:footnotes :processed (get-in state [:footnotes :next-fn-id])]
                                     (get-in state [:footnotes :unprocessed match])))]
        (recur next-text next-state)))))

(defn footnote-link [text {:keys [code codeblock footnotes] :as state}]
  (cond
    (or (nil? (:unprocessed footnotes)) code codeblock)
    [text state]

    (footnote (string/trim text))
    ["" state]

    :else
    (let [[text state] (replace-all-footnote-links text state)]
      [text state])))

(defn make-image-reference [src alt title]
  (let [title-text (str (if title (str "\" title=" (string/join title) "") "\""))]
    (str "<img src=\"" src "\" alt=\"" alt title-text " />")))

(defn image-reference-link [text {:keys [references] :as state}]
  (if (or (not (:reference-links? state)) (empty? references))
    [text state]
    (let [matcher #"!\[([^\]]+)\]\s*(\[[a-zA-Z0-9 ]+\])"
          matches (distinct (re-seq matcher text))]
      (loop [ms matches
             new-text text]
        (if (seq ms)
          (let [[m alt ref] (first ms)
                refval (get references ref)
                im (make-image-reference (first refval) alt (second refval))]
            (recur (rest ms) (string/replace new-text m im)))
          [new-text state])))))

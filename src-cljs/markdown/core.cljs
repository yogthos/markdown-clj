(ns markdown.core
  (:use [markdown.transformers
         :only [*next-line* *substring* transformer-vector parse-reference parse-reference-link]]))

(defn- init-transformer [{:keys [replacement-transformers custom-transformers]}]
  (fn [html line next-line state]
    (binding [*next-line* next-line]
      (let [[text new-state]
            (reduce
              (fn [[text state] transformer]
                (transformer text state))
              [line state]
              (or replacement-transformers
                  (into transformer-vector custom-transformers)))]
        (.append html text)
        new-state))))

(defn format "Removed from cljs.core 0.0-1885, Ref. http://goo.gl/su7Xkj"
  [fmt & args] (apply goog.string/format fmt args))

(defn parse-references [lines]
  (let [references (atom {})]
    (doseq [line lines]
      (parse-reference-link line references))
    @references))

(defn md->html
  "processes input text line by line and outputs an HTML string"
  [text & params]
  (binding [markdown.transformers/*substring* (fn [s n] (apply str (drop n s)))
            markdown.transformers/formatter format]
    (let [params      (when params (apply (partial assoc {}) params))
          lines       (.split text "\n")
          html        (goog.string.StringBuffer. "")
          references  (when (:reference-links? params) (parse-references lines))
          transformer (init-transformer params)]
      (loop [[line & more] lines
             state (merge {:clojurescript true
                           :references references
                           :last-line-empty? true}
                          params)]
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

(defn ^:export mdToHtml
  "Js accessible wrapper"
  [& params]
  (apply md->html params))

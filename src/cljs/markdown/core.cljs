(ns markdown.core
  (:require [markdown.common
             :refer [*substring* *inhibit-separator*]]
            [markdown.links
             :refer [parse-reference parse-reference-link parse-footnote-link]]
            [markdown.transformers
             :refer [transformer-vector footer parse-metadata-headers]]))


(defn- init-transformer [{:keys [replacement-transformers custom-transformers inhibit-separator]}]
  (fn [html line next-line state]
    (binding [*inhibit-separator* inhibit-separator]
      (let [[text new-state]
            (reduce
              (fn [[text state] transformer]
                (transformer text (assoc state :next-line next-line)))
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

(defn parse-footnotes [lines]
  (let [footnotes (atom {:next-fn-id 1 :processed {} :unprocessed {}})]
    (doseq [line lines]
      (parse-footnote-link line footnotes))
    @footnotes))

(defn parse-metadata [lines]
  (let [[metadata lines] (split-with #(not-empty (.trim %)) lines)]
    [(parse-metadata-headers metadata) lines]))

(defn md-to-html-string*
  "processes input text line by line and outputs an HTML string"
  [text params]
  (binding [markdown.common/*substring* (fn [s n] (apply str (drop n s)))
            markdown.transformers/*formatter* format]
    (let [params      (when params (apply (partial assoc {}) params))
          lines       (.split (str text "\n") "\n")
          html        (goog.string.StringBuffer. "")
          references  (when (:reference-links? params) (parse-references lines))
          footnotes   (when (:footnotes? params) (parse-footnotes lines))
          [metadata lines] (if (:parse-meta? params) (parse-metadata lines) [nil lines])
          transformer (init-transformer params)]
      (loop [[line & more] lines
             state (merge {:clojurescript    true
                           :references       references
                           :footnotes        footnotes
                           :last-line-empty? true}
                          params)]
        (let [line  (if (:skip-next-line? state) "" line)
              state
              (if (:buf state)
                (transformer html
                             (:buf state)
                             (:next-line state)
                             (-> state
                                 (dissoc :buf :lists :next-line)
                                 (assoc :last-line-empty? true)))
                state)]
          (if (not-empty more)
            (recur more
                   (assoc (transformer html line (first more) (dissoc state :skip-next-line?))
                     :last-line-empty? (empty? line)))
            (transformer (.append html (footer (:footnotes state))) line "" (assoc state :eof true)))))
      {:metadata metadata :html (.toString html)})))

(defn md->html [text & params]
  (:html (md-to-html-string* text params)))

(defn md->html-with-meta [text & params]
  (md-to-html-string* text (into [:parse-meta? true] params)))

(defn ^:export mdToHtml
  "Js accessible wrapper"
  [& params]
  (apply md->html params))

(defn ^:export mdToHtmlWithMeta
  "Js accessible wrapper"
  [& params]
  (apply md->html-with-meta params))

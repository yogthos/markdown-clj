(ns markdown.lists
  (:require [clojure.string :as string]
            [markdown.common :refer [*substring* make-heading]]))

(defn close-lists [lists]
  (string/join
    (for [[list-type] lists]
      (str "</li></" (name list-type) ">"))))

(defn content-indent
  "Column where the innermost open list item's content begins, 0 when no list is open."
  [lists]
  (if-let [entry (last lists)]
    (or (nth entry 2 nil) (second entry))
    0))

(defn add-row [row-type list-type num-indents indents content-col content state]
  (if list-type
    (cond
      (< num-indents indents)
      (let [lists-to-close  (take-while #(> (second %) num-indents) (reverse (:lists state)))
            remaining-lists (vec (drop-last (count lists-to-close) (:lists state)))]
        (if (empty? remaining-lists)
          ;; dedenting below the root list level - close any inner lists
          ;; but keep the outermost list open with adjusted indentation
          [(apply str (close-lists (butlast lists-to-close)) "</li><li>" content)
           (assoc state :lists [[row-type num-indents content-col]])]
          [(apply str (close-lists lists-to-close) "</li><li>" content)
           (assoc state :lists (if (> num-indents (second (last remaining-lists)))
                                 (conj remaining-lists [row-type num-indents content-col])
                                 remaining-lists))]))

      (> num-indents indents)
      [(str "<" (name row-type) "><li>" content)
       (update-in state [:lists] conj [row-type num-indents content-col])]

      (= num-indents indents)
      [(str "</li><li>" content) state])

    [(str "<" (name row-type) "><li>" content)
     (assoc state :lists [[row-type num-indents content-col]])]))

(defn ul [text state]
  (let [[list-type indents] (last (:lists state))
        num-indents (count (take-while (partial = \space) text))
        content     (string/trim (*substring* text (inc num-indents)))]
    (add-row :ul list-type num-indents indents (+ num-indents 2)
             (or (make-heading content false) content) state)))

(defn ol [text state]
  (let [[list-type indents] (last (:lists state))
        num-indents (count (take-while (partial = \space) text))
        trimmed     (string/trim text)
        marker      (count (re-find #"^[0-9]+\." trimmed))
        content     (string/trim (string/join (drop-while (partial not= \space) trimmed)))]
    (add-row :ol list-type num-indents indents (+ num-indents marker 1)
             (or (make-heading content false) content) state)))

(defn- continues-list?
  "True when a marker of `list-type` at `indents` adds an item to a list that
  is already open, rather than starting a new one."
  [lists list-type indents]
  (some (fn [[open-type open-indents]]
          (and (= open-type list-type) (= open-indents indents)))
        lists))

(defn- empty-item-interrupts-text?
  "CommonMark: the first item of a list cannot interrupt a paragraph when the
  item is empty. A line such as `2025.` that follows paragraph or list item
  text is therefore a continuation of that text, not an empty list item."
  [list-type indents {:keys [last-line-empty? paragraph lists]}]
  (and (not last-line-empty?)
       (or paragraph (seq lists))
       (not (continues-list? lists list-type indents))))

(defn li [text {:keys [codeblock last-line-empty? eof lists hr] :as state}]
  (cond

    codeblock
    [text state]

    ;; the hr transformer already decided whether the break ends the list, so
    ;; the rendered break is left to sit in the open item
    hr
    [text state]

    (and last-line-empty? (string/blank? text))
    [(str (close-lists (reverse lists)) text)
     (-> state (dissoc :lists) (assoc :last-line-empty? false))]

    (and lists codeblock)
    [text state]

    (and (not eof)
         lists
         (string/blank? text))
    [text (assoc state :last-line-empty? false :eof false)]

    :else
    (let [indents  (if last-line-empty? 0 (count (take-while (partial = \space) text)))
          trimmed  (string/trim text)
          spaces   (count (take-while (partial = \space) text))
          empty-item (cond
                       (re-matches #"[\*\+-]" trimmed) :ul
                       (re-matches #"[0-9]+\." trimmed) :ol)]
      (cond
        (and empty-item (empty-item-interrupts-text? empty-item spaces state))
        [(if (seq lists) (str " " trimmed) text) state]

        ;; a marker with no content is an empty list item, not a blank line
        (re-find #"^[\*\+-](?: |$)" trimmed)
        (let [[text state] (ul text state)]
          [text (assoc state :list-line true)])

        (re-find #"^[0-9]+\.(?: |$)" trimmed)
        (let [[text state] (ol text state)]
          [text (assoc state :list-line true)])

        (pos? indents)
        [text state]

        (and (or eof last-line-empty?)
             (not-empty lists))
        [(close-lists (reverse lists))
         (assoc state :lists [] :buf text :list-line true)]

        ;; a lazy continuation line of a list item's text
        (and (seq lists) (not last-line-empty?) (not (string/blank? text)))
        [(str " " text) state]

        :else
        [text state]))))

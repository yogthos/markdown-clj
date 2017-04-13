(ns markdown.lists
  (:require [clojure.string :as string]
            [markdown.common :refer [*substring* make-heading]]))

(defn close-lists [lists]
  (string/join
    (for [[list-type] lists]
      (str "</li></" (name list-type) ">"))))

(defn add-row [row-type list-type num-indents indents content state]
  (if list-type
    (cond
      (< num-indents indents)
      (let [lists-to-close  (take-while #(> (second %) num-indents) (reverse (:lists state)))
            remaining-lists (vec (drop-last (count lists-to-close) (:lists state)))]

        [(apply str (close-lists lists-to-close) "</li><li>" content)
         (assoc state :lists (if (> num-indents (second (last remaining-lists)))
                               (conj remaining-lists [row-type num-indents])
                               remaining-lists))])

      (> num-indents indents)
      [(str "<" (name row-type) "><li>" content)
       (update-in state [:lists] conj [row-type num-indents])]

      (= num-indents indents)
      [(str "</li><li>" content) state])

    [(str "<" (name row-type) "><li>" content)
     (assoc state :lists [[row-type num-indents]])]))

(defn ul [text state]
  (let [[list-type indents] (last (:lists state))
        num-indents (count (take-while (partial = \space) text))
        content     (string/trim (*substring* text (inc num-indents)))]
    (add-row :ul list-type num-indents indents (or (make-heading content false) content) state)))

(defn ol [text state]
  (let [[list-type indents] (last (:lists state))
        num-indents (count (take-while (partial = \space) text))
        content     (string/trim (string/join (drop-while (partial not= \space) (string/trim text))))]
    (add-row :ol list-type num-indents indents (or (make-heading content false) content) state)))

(defn li [text {:keys [code codeblock last-line-empty? eof lists] :as state}]
  (cond

    (and last-line-empty? (string/blank? text))
    [(str (close-lists (reverse lists)) text)
     (-> state (dissoc :lists) (assoc :last-line-empty? false))]

    (or code codeblock)
    (if (and lists (or last-line-empty? eof))
      [(str (close-lists (reverse lists)) text)
       (-> state (dissoc :lists) (assoc :last-line-empty? false))]
      [text state])

    (and (not eof)
         lists
         (string/blank? text))
    [text (assoc state :last-line-empty? true)]

    :else
    (let [indents  (if last-line-empty? 0 (count (take-while (partial = \space) text)))
          trimmed  (string/trim text)
          in-list? (:lists state)]
      (cond
        (re-find #"^[\*\+-] " trimmed)
        (ul (if in-list? text trimmed) state)

        (re-find #"^[0-9]+\. " trimmed)
        (ol (if in-list? text trimmed) state)

        (pos? indents)
        [text state]

        (and (or eof last-line-empty?)
             (not-empty lists))
        [(close-lists (reverse lists))
         (assoc state :lists [] :buf text)]

        :else
        [text state]))))

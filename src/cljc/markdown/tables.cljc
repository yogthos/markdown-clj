(ns markdown.tables
  (:require [clojure.string :as string]))

(defn parse-table-row [text]
  (->> text
       (#(if (= (first %) \|)
          (apply str (rest %))
          %))
       (string/trim)
       (#(string/split % #"\|"))
       (map string/trim)
       (map #(identity {:text %}))))

(defn table-row->str [row-data is-header?]
  (reduce
    (fn [row col]
      (let [alignment-str (when (:alignment col)
                            (str " align='" (name (:alignment col)) "'"))]
        (if is-header?
          (str row
               "<th" alignment-str ">" (:text col) "</th>")
          (str row
               "<td" alignment-str ">" (:text col) "</td>"))))
    ""
    row-data))

(defn table->str [table]
  (let [table-data (map-indexed vector (:data table))
        alignment-seq (:alignment-seq table)]
    (str "<table>"
         (reduce
           (fn [table-acc row]
             (let [row-idx (first row)
                   row-data (mapv merge (second row) alignment-seq)
                   is-header? (= row-idx 0)
                   is-first-row? (= row-idx 1)
                   is-last-row? (= row-idx (dec (count table-data)))]
               (str
                 table-acc
                 (cond
                   is-header?
                   "<thead>"
                   is-first-row?
                   "<tbody>")
                 "<tr>"
                 (table-row->str row-data is-header?)
                 "</tr>"
                 (cond
                   is-header?
                   "</thead>"
                   is-last-row?
                   "</tbody>"))))
           ""
           table-data)
         "</table>")))

(defn divider-seq->alignment [divider-seq]
  (mapv (fn [divider]
          (cond
            (= (re-find #"^:-+" (:text divider))
               (:text divider))
            (identity {:alignment :left})

            (= (re-find #"^-+:" (:text divider))
               (:text divider))
            (identity {:alignment :right})

            (= (re-find #"^:-+:" (:text divider))
               (:text divider))
            (identity {:alignment :center})

            :else
            nil))
        divider-seq))

(defn table [text state]
  (let [table-row-re (re-find #"\|(?: [\S ]+ \|)+" text)
        table-divider-re (re-find #"\|(?: :?-+:? \|)+" text)
        is-table-row? (= table-row-re text)
        is-table-header?
        (and is-table-row?
             (not (get-in state [:table :in-table-body?])))
        is-table-divider?
        (and (= table-divider-re text)
             (get-in state [:table :in-table-body?])
             (get-in state [:table :is-prev-header?]))]
    (cond
      is-table-header?
      (let [header-seq (parse-table-row text)]
        ["" (-> state
                (assoc-in [:table :is-prev-header?] true)
                (assoc-in [:table :in-table-body?] true)
                (update-in [:table :data] (fnil conj []) (vec header-seq)))])

      is-table-divider?
      (let [divider-seq (parse-table-row text)]
        ["" (-> state
                (assoc-in [:table :is-prev-header?] false)
                (assoc-in [:table :alignment-seq]
                          (divider-seq->alignment divider-seq)))])

      is-table-row?
      (let [row-seq (parse-table-row text)]
        ["" (-> state
                (assoc-in [:table :is-prev-header?] false)
                (update-in [:table :data] (fnil conj []) (vec row-seq)))])

      :else
      (let [out (if (empty? (get-in state [:table :data]))
                  text
                  (str (table->str (:table state)) text))]
        [out (dissoc state :table)]))))
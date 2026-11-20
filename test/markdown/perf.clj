(ns markdown.perf
  "Performance harness. Run it with `lein perf` or `clojure -M:perf`.

  Converts every .md file of a corpus over and over, and prints how long one
  pass over the corpus takes together with a checksum of the generated HTML.
  The checksum shows that a performance change did not change any output.

  Arguments are the files and directories to use as the corpus (default:
  test/files)."
  (:require [clojure.java.io :as io]
            [clojure.string :as string]
            [markdown.core :as markdown])
  (:import (java.io File)
           (java.security MessageDigest)))

(def ^:private warmup-secs 10)
(def ^:private rounds 30)

(defn- load-corpus
  "The text of every .md file under `paths`."
  [paths]
  (->> paths
       (mapcat (comp file-seq io/file))
       (filter #(and (.isFile ^File %) (string/ends-with? (str %) ".md")))
       (sort-by str)
       (mapv slurp)))

(defn- checksum
  "The first 16 hex characters of the SHA-256 of all the generated HTML."
  [docs]
  (let [digest (MessageDigest/getInstance "SHA-256")]
    (doseq [doc docs]
      (.update digest (.getBytes ^String (markdown/md-to-html-string doc) "UTF-8"))
      (.update digest (byte 0)))
    (subs (string/join (map #(format "%02x" %) (.digest digest))) 0 16)))

(defn- time-ms [f]
  (let [start (System/nanoTime)]
    (f)
    (/ (- (System/nanoTime) start) 1e6)))

(defn- pass-times
  "Converts `docs` over and over for `warmup-secs` seconds to let the JIT settle, without timing it.
   Then times `rounds` more passes over `docs` and returns how long each one took, in ms."
  [docs]
  (let [pass     #(run! markdown/md-to-html-string docs)
        deadline (+ (System/nanoTime) (* warmup-secs 1e9))]
    (while (< (System/nanoTime) deadline)
      (pass))
    (vec (repeatedly rounds #(time-ms pass)))))

(defn- empty-call-micros
  "What one call costs before any text is looked at."
  []
  (let [calls 20000]
    (dotimes [_ calls] (markdown/md-to-html-string ""))
    (/ (* 1000 (time-ms #(dotimes [_ calls] (markdown/md-to-html-string "")))) calls)))

(defn -main [& paths]
  (let [docs   (load-corpus (or paths ["test/files"]))
        chars  (reduce + (map count docs))
        times  (pass-times docs)
        median (nth (sort times) (quot rounds 2))]
    (println (format "corpus:           %d documents, %d chars" (count docs) chars))
    (println (format "checksum:         %s" (checksum docs)))
    (println (format "one pass:         median %.2f ms, fastest %.2f ms (%d rounds)"
                     median (apply min times) rounds))
    (println (format "per 1,000 chars:  %.3f ms" (/ median (/ chars 1000.0))))
    (println (format "empty string:     %.1f µs per call" (empty-call-micros)))))

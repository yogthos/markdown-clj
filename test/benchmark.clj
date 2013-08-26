(ns benchmark
  (:require [clojure.test :refer :all]
            [markdown.core :as markdown]
            [criterium.core :as criterium]))



(deftest ^:benchmark bench-string []
  (criterium/bench
    (markdown/md-to-html-string
      "\nLorem ipsum **dolor** sit amet, consectetur _adipisicing elit_, sed do eiu^smod tem^por incididunt ut labore")))

(deftest ^:benchmark bench-file []
  (criterium/bench
    (markdown/md-to-html "test.md" (java.io.StringWriter.))))

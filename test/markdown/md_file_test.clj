(ns markdown.md-file-test
  (:require [markdown.core :as markdown]
            [markdown.transformers :as transformers]
            [markdown.tables :as tables]
            [clojure.test :refer :all]))

(deftest references
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "references.md") wrt :reference-links? true)
    (is (= (slurp (str "test/files" java.io.File/separator "references.html")) (.toString wrt)))))

(deftest footnotes
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "footnotes.md") wrt :footnotes? true)
    (is (= (slurp (str "test/files" java.io.File/separator "footnotes.html")) (.toString wrt)))))

(deftest all-together
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "test.md") wrt)
    (is (= (slurp (str "test/files" java.io.File/separator "test.html")) (.toString wrt)))))

(deftest tables
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "tables.md") wrt)
    (is (= (slurp (str "test/files" java.io.File/separator "tables.html")) (.toString wrt)))))

(deftest md-metadata
  (testing "Finds all metadata and correctly parses rest of file."
    (let [md (slurp (str "test/files/metadata.md"))
          {:keys [metadata html]} (markdown/md-to-html-string-with-meta md)]
      (is (= "<h1>The Document</h1>" html))
      (is (= {:title       ["My Document"]
              :summary     ["A brief description of my document."]
              :authors     ["Justin May"
                            "Spooky Mulder"
                            "End Line At End\n"]
              :date        ["October 31, 2015"]
              :blank-value []
              :base_url    ["http://example.com"]}
             metadata)))))

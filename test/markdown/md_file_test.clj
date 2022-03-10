(ns markdown.md-file-test
  (:require [markdown.core :as markdown]
            [markdown.transformers :as transformers]
            [clojure.string :as string]
            [clojure.test :refer :all]))

(deftest references
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "references.md") wrt :reference-links? true)
    (is (= (slurp (str "test/files" java.io.File/separator "references.html")) (.toString wrt)))))

(deftest img-references
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "img_references.md") wrt :reference-links? true)
    (is (= (clojure.string/trim-newline
            (slurp (str "test/files" java.io.File/separator "img_references.html")))
           (.toString wrt)))))

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

(deftest tables
  (let [wrt (java.io.StringWriter.)]
    (markdown/md-to-html (str "test/files" java.io.File/separator "tables.md") wrt)
    (is (= (slurp (str "test/files" java.io.File/separator "tables.html")) (.toString wrt)))))

(deftest md-metadata
  (testing "Finds all metadata and correctly parses rest of file."
    (let [md (slurp (str "test/files/metadata.md"))
          {:keys [metadata html]} (markdown/md-to-html-string-with-meta md)
          [_ line-count] (transformers/parse-metadata-headers (string/split-lines md))]
      (is (= "<h1>The Document</h1>" html))
      (is (= {:title       ["My Document"]
              :summary     ["A brief description of my document."]
              :authors     ["Justin May"
                            "Spooky Mulder"
                            "End Line At End\n"]
              :date        ["October 31, 2015"]
              :blank-value []
              :base_url    ["http://example.com"]}
             metadata))
      (is (= 8 line-count) "Metadata-parser provides correct line count"))))

(deftest md-metadata-only
  (testing "Finds all metadata, without parsing the rest of the file."
    (let [md (slurp (str "test/files/metadata.md"))
          metadata (markdown/md-to-meta md)]
      (is (= {:title       ["My Document"]
              :summary     ["A brief description of my document."]
              :authors     ["Justin May"
                            "Spooky Mulder"
                            "End Line At End\n"]
              :date        ["October 31, 2015"]
              :blank-value []
              :base_url    ["http://example.com"]}
             metadata)))))

(deftest md-yaml-metadata
  (testing "Finds all yaml metadata and correctly parses rest of file."
    (let [md (slurp (str "test/files/metadata-yaml.md"))
          {:keys [metadata html]} (markdown/md-to-html-string-with-meta md)
          [_ line-count] (transformers/parse-metadata-headers (string/split-lines md))]
      (is (= "<h1>The Document</h1>" html))
      (is (= {:title       "My Document"
              :summary     "A brief description of my document."
              :authors     ["Justin May"
                            "Spooky Mulder"
                            "End Line At End"]
              :date        "October 31, 2015"
              :base_url    "http://example.com"}
             metadata))
      (is (= 12 line-count) "Metadata-parser provides correct line count"))))

(deftest md-edn-metadata
  (testing "Finds edn map metadata and correctly parses rest of file."
    (let [md (slurp (str "test/files/metadata-edn.md"))
          {:keys [metadata html]} (markdown/md-to-html-string-with-meta md)
          [_ line-count] (transformers/parse-metadata-headers (string/split-lines md))]
      (is (= "<h1>The Document</h1>" html))
      (is (= {:title       "My Document"
              :summary     "A brief description of my document."
              :authors     ["Justin May"
                            "Spooky Mulder"
                            "End Line At End"]
              :date        "October 31, 2015"
              :base_url    "http://example.com"}
             metadata))
      (is (= 6 line-count) "Metadata-parser provides correct line count"))))


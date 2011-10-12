(ns mdtests
  (:import [java.io StringReader StringWriter])
  (:require markdown)
  (:use clojure.test))

(defn convert [text]
  (let [input (new StringReader text)
        output (new StringWriter)] 
    (markdown/markdown-to-html input output)
    (.toString output)))


(deftest heading1 
  (is (= "<h1>foo</h1>" (convert "#foo"))))

(deftest heading2 
  (is (= "<h2>foo</h2>" (convert "##foo"))))

(deftest hr
  (is (= "<hr/>" (convert "***"))))

(deftest italics
  (is (= "<i>foo</i>" (convert "*foo*"))))

(deftest bold
  (is (= "<b>foo</b>" (convert "**foo**"))))

(deftest bold-inside-italics
  (is (= "<i>foo<b>bar</b>baz</i>" (convert "*foo**bar**baz*"))))

(deftest italics-inside-bold
  (is (= "<b>foo<i>bar</i>baz</b>" (convert "**foo*bar*baz**"))))

(deftest paragraph
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</p>"
         (convert "\nLorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore"))))

(deftest paragraph-multiline
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</p>"
         (convert "\nLorem ipsum dolor sit amet, consectetur adipisicing elit, \nsed do eiusmod tempor incididunt ut labore"))))


(deftest mulitple-paragraphs
  (is (= "<p>foo bar baz</p><p>foo bar baz</p>" 
      (convert "\nfoo bar baz\n\n\nfoo bar baz"))))

(deftest ul
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul>" 
         (convert "* foo\n* bar\n* baz"))))

(deftest code
  (is (= "foo bar baz <pre>x = y + z;</pre> foo"
         (convert "foo bar baz `x = y + z;` foo"))))

(deftest multiline code
  (is (= "<pre>    x = 5\n    y = 6\n    z = x + y</pre>"
         (convert "    x = 5\n    y = 6\n    z = x + y")))) 

(run-tests)

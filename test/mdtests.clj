(ns mdtests
  (:import [java.io StringReader StringWriter])
  (:require markdown)
  (:use clojure.test))

(defn convert [text]
  (let [input (new StringReader text)
        output (new StringWriter)] 
    (markdown/process-stream input output)
    (.toString output)))

(deftest heading1 
  (is (= "<p><h1>foo</h1></p>\n" (convert "#foo"))))

(deftest heading2 
  (is (= "<p><h2>foo</h2></p>\n" (convert "##foo"))))

(deftest hr
  (is (= "<hr/>\n" (convert "***"))))

(deftest italics
  (is (= "<i>foo</i>\n" (convert "*foo*"))))

(deftest bold
  (is (= "<b>foo</b>\n" (convert "**foo**"))))

(deftest bold-inside-italics
  (is (= "<i>foo<b>bar</b>baz</i>\n" (convert "*foo**bar**baz*"))))

(deftest italics-inside-bold
  (is (= "<b>foo<i>bar</i>baz</b>\n" (convert "**foo*bar*baz**"))))

(deftest paragraph
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>\n"
         (convert "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat"))))

(deftest paragraph-multiline
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit,\nsed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nUt enim ad minim veniam, quis nostrud exercitation\nullamco laboris nisi ut aliquip ex ea commodo consequat</p>\n"
         (convert "Lorem ipsum dolor sit amet, consectetur adipisicing elit,\nsed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nUt enim ad minim veniam, quis nostrud exercitation\nullamco laboris nisi ut aliquip ex ea commodo consequat"))))

(deftest mulitple-paragraphs
  (is (= "<p>foo bar baz\n</p>\n<p>foo bar baz</p>\n" 
      (convert "foo bar baz\n\nfoo bar baz"))))

(deftest ul
  (is (= " <ul>\n<li>foo</li>\n <li>bar</li>\n <li>baz</li>\n</ul>\n" 
         (convert "* foo\n* bar\n* baz"))))

(deftest code
  (is (= "<p>foo bar baz <pre>x = y + z;</pre> foo</p>\n"
         (convert "foo bar baz `x = y + z;` foo"))))

(deftest multiline code
  (is (= "\n    <pre>    x = 5\n    y = 6\n    z = x + y</pre>\n"
         (convert "\n    x = 5\n    y = 6\n    z = x + y")))) 

(run-tests 'mdtests)


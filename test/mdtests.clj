(ns mdtests  
  (:require markdown)
  (:use clojure.test))

(deftest heading1 
  (is (= "<h1>foo</h1>" (markdown/md-to-html-string "#foo"))))

(deftest heading2 
  (is (= "<h2>foo</h2>" (markdown/md-to-html-string "##foo"))))

(deftest hr
  (is (= "<hr/>" (markdown/md-to-html-string "***")))
  (is (= "<hr/>" (markdown/md-to-html-string " * * * ")))
  (is (= "<hr/>" (markdown/md-to-html-string " *****")))
  (is (= "<hr/>" (markdown/md-to-html-string "- - - "))))

(deftest em
  (is (= "<p><em>foo</em></p>" (markdown/md-to-html-string "*foo*"))))

(deftest italics
  (is (= "<p><i>foo</i></p>" (markdown/md-to-html-string "_foo_"))))

(deftest bold
  (is (= "<p><b>foo</b></p>" (markdown/md-to-html-string "**foo**"))))

(deftest alt-bold
  (is (= "<p><b>foo</b></p>" (markdown/md-to-html-string "__foo__"))))

(deftest bold-inside-em
  (is (= "<p><em>foo<b>bar</b>baz</em></p>" (markdown/md-to-html-string "*foo**bar**baz*"))))

(deftest em-inside-bold
  (is (= "<p><b>foo<em>bar</em>baz</b></p>" (markdown/md-to-html-string "**foo*bar*baz**"))))

(deftest paragraph
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</p>"
         (markdown/md-to-html-string "\nLorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore"))))

(deftest paragraph-multiline
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</p>"
         (markdown/md-to-html-string "\nLorem ipsum dolor sit amet, consectetur adipisicing elit, \nsed do eiusmod tempor incididunt ut labore"))))

(deftest mulitple-paragraphs
  (is (= "<p>foo bar baz</p><p>foo bar baz</p>" 
      (markdown/md-to-html-string "\nfoo bar baz\n\n\nfoo bar baz"))))

(deftest ul
  (is (= "<p><ul><li>foo</li><li>bar</li><li>baz</li></ul></p>" 
         (markdown/md-to-html-string "* foo\n* bar\n* baz"))))

(deftest ul-nested
  (is (= "<p><ul><li>first item<ul><li>first sub-item<ul><li>second sub-item</li></ul></li><li>third sub-item</li></ul></li><li>second item<ul><li>first sub-item</li><li>second sub-item</li></ul></li><li>third item</li></ul></p>" 
         (markdown/md-to-html-string "* first item\n * first sub-item\n  * second sub-item\n * third sub-item\n* second item\n * first sub-item\n * second sub-item\n* third item"))))

(deftest ol
  (is (= "<p><ol><li> Foo</li><li> Bar</li><li> Baz</li></ol></p>"
         (markdown/md-to-html-string "1. Foo\n2. Bar\n3. Baz"))))

(deftest ul-in-ol
  (is (= "<p><ol><li> Bar<ol><li> Subbar<ul><li>foo</li><li>bar</li><li>baz</li></ul><li> Baz</li></ol></li></ol></p>"         
         (markdown/md-to-html-string "1. Bar\n 2. Subbar\n  * foo\n  * bar\n  * baz\n3. Baz"))))

(deftest ol-in-ul
  (is (= "<p><ul><li>Foo<ol><li> Bar<ol><li> Subbar</li></ol></li></ol><li>Baz</li></ul></p>" 
         (markdown/md-to-html-string "* Foo\n 1. Bar\n  1. Subbar\n* Baz"))))


(deftest code
  (is (= "<p>foo bar baz <code>x = y + z;</code> foo</p>"
         (markdown/md-to-html-string "foo bar baz `x = y + z;` foo"))))

(deftest multiline-code
  (is (= "<pre><code>    x = 5\n    y = 6\n    z = x + y</code></pre>"
         (markdown/md-to-html-string "    x = 5\n    y = 6\n    z = x + y")))) 

(deftest codeblock
  (is (= "<pre><code>\n(defn- write [writer text]\n  (doseq [c text]\n    (.write writer (int c))))</code></pre>"
         (markdown/md-to-html-string "```(defn- write [writer text]\n  (doseq [c text]\n    (.write writer (int c))))\n```"))))

(deftest stirkethrough
  (is (= "<p><del>foo</del></p>"
         (markdown/md-to-html-string "~~foo~~"))))

(deftest superscript
  (is (= "<p>foo<sup>bar</sup> baz</p>"
         (markdown/md-to-html-string "foo^bar baz"))))

(deftest link
  (is (= "<p><a href='http://github.com'>github</a></p>"
         (markdown/md-to-html-string "[github](http://github.com)"))))

(deftest img
  (is (= "<p><img src=\"/path/to/img.jpg\" alt=\"Alt text\" /></p>" 
         (markdown/md-to-html-string "![Alt text](/path/to/img.jpg)"))))

(deftest bad-link
  (is (= "<p>[github](http://github.comfooo</p>" 
         (markdown/md-to-html-string "[github](http://github.comfooo"))))

(deftest bad-link-title
  (is (= "<p>[github(http://github.comfooo)</p>" 
         (markdown/md-to-html-string "[github(http://github.comfooo)"))))

;(run-tests)


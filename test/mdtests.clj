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
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul>" 
         (markdown/md-to-html-string "* foo\n* bar\n* baz"))))

(deftest ul-nested
  (is (= "<ul><li>first item<ul><li>first sub-item<ul><li>second sub-item</li></ul></li><li>third sub-item</li></ul></li><li>second item<ul><li>first sub-item</li><li>second sub-item</li></ul></li><li>third item</li></ul>" 
         (markdown/md-to-html-string "* first item\n * first sub-item\n  * second sub-item\n * third sub-item\n* second item\n * first sub-item\n * second sub-item\n* third item"))))

(deftest ol
  (is (= "<ol><li>Foo</li><li>Bar</li><li>Baz</li></ol>"
         (markdown/md-to-html-string "1. Foo\n2. Bar\n3. Baz"))))

(deftest ul-in-ol
  (is (= "<ol><li>Bar<ol><li>Subbar<ul><li>foo</li><li>bar</li><li>baz</li></ul></li></ol></li><li>Baz</li></ol>"         
         (markdown/md-to-html-string "1. Bar\n 2. Subbar\n  * foo\n  * bar\n  * baz\n3. Baz"))))

(deftest ol-in-ul
  (is (= "<ul><li>Foo<ol><li>Bar<ol><li>Subbar</li></ol></li></ol></li><li>Baz</li></ul>" 
         (markdown/md-to-html-string "* Foo\n 1. Bar\n  1. Subbar\n* Baz"))))

(deftest multilist
  (is (=
        "<ul><li>foo</li><li>bar<ul><li>baz<ol><li>foo</li><li>bar</li></ol></li><li>fuzz<ul><li>blah</li><li>blue</li></ul></li></ul></li><li>brass</li></ul>"
        (markdown/md-to-html-string 
"* foo
* bar

   * baz
     1. foo
     2. bar

   * fuzz

      * blah
      * blue
* brass"))))

(deftest code
  (is (= "<p>foo bar baz <code>x = y + z;</code> foo</p>"
         (markdown/md-to-html-string "foo bar baz `x = y + z;` foo")))
  (is (= "<p><code>&lt;?xml version='1.0' encoding='UTF-8'?&gt;&lt;channel&gt;&lt;/channel&gt;</code></p>"
         (markdown/md-to-html-string "`<?xml version='1.0' encoding='UTF-8'?><channel></channel>`")))
  (is (= "<p>foo bar baz <code>&#40;fn &#91;x &amp; xs&#93; &#40;str &quot;x:&quot; x&#41;&#41;</code> foo</p>"
         (markdown/md-to-html-string "foo bar baz `(fn [x & xs] (str \"x:\" x))` foo"))))

(deftest multiline-code
  (is (= "<pre><code>    x = 5\n    y = 6\n    z = x + y</code></pre>"
         (markdown/md-to-html-string "    x = 5\n    y = 6\n    z = x + y")))
  (is (= "<pre><code>    x = 5\n    y = 6\n    z = x + y\n    &#40;fn &#91;x &amp; xs&#93; &#40;str &quot;x&quot;&#41;&#41;</code></pre>"
         (markdown/md-to-html-string "    x = 5\n    y = 6\n    z = x + y\n    (fn [x & xs] (str \"x\"))")))) 

(deftest codeblock
  (is (= "<pre><code>\n&#40;defn- write &#91;writer text&#93;\n  &#40;doseq &#91;c text&#93;\n    &#40;.write writer &#40;int c&#41;&#41;&#41;&#41;</code></pre>"
         (markdown/md-to-html-string "``` (defn- write [writer text]\n  (doseq [c text]\n    (.write writer (int c))))\n```")))
  (is (= "<pre><code>\n&#40;fn &#91;x &amp; xs&#93;\n  &#40;str &quot;x&quot;&#41;&#41;</code></pre>" 
         (markdown/md-to-html-string "``` (fn [x & xs]\n  (str \"x\"))\n```")))
  (is (= "<pre><code>\n&#40;fn &#91;x &amp; xs&#93;\n  &#40;str &quot;x&quot;&#41;&#41;</code></pre>" 
         (markdown/md-to-html-string "```\n(fn [x & xs]\n  (str \"x\"))\n```")))
  (is (= "<pre><code class=\"brush: clojure;\">\n&#40;fn &#91;x &amp; xs&#93;\n  &#40;str &quot;x&quot;&#41;&#41;</code></pre>" 
         (markdown/md-to-html-string "```clojure (fn [x & xs]\n  (str \"x\"))\n```"))))

(deftest stirkethrough
  (is (= "<p><del>foo</del></p>"
         (markdown/md-to-html-string "~~foo~~"))))

(deftest superscript
  (is (= "<p>foo<sup>bar</sup> baz</p>"
         (markdown/md-to-html-string "foo^bar baz"))))

(deftest link
  (is (= "<p><a href='http://github.com'>github</a></p>"
         (markdown/md-to-html-string "[github](http://github.com)")))
  (is (= "<p><a href='http://github.com/&#126;'>github</a></p>"
         (markdown/md-to-html-string "[github](http://github.com/~)")))
  (is (= "<p><a href='http://github.com/&#94;'>github</a></p>"
         (markdown/md-to-html-string "[github](http://github.com/^)")))
  (is (= "<p><a href='http://github.com/&#42;'>github</a></p>"
         (markdown/md-to-html-string "[github](http://github.com/*)")))
  (is (= "<ul><li><a href='http://github.com/&#42;'>github</a></li></ul>"
         (markdown/md-to-html-string "* [github](http://github.com/*)"))))

(deftest img
  (is (= "<p><img src=\"/path/to/img.jpg\" alt=\"Alt text\" /></p>" 
         (markdown/md-to-html-string "![Alt text](/path/to/img.jpg)")))
  (is (= "<p><img src=\"/path/to/&#95;img&#95;.jpg\" alt=\"Alt text\" title=\"Optional Title\" /></p>" 
         (markdown/md-to-html-string "![Alt text](/path/to/_img_.jpg \"Optional Title\")"))))

(deftest bad-link
  (is (= "<p>[github](http://github.comfooo</p>" 
         (markdown/md-to-html-string "[github](http://github.comfooo"))))

(deftest bad-link-title
  (is (= "<p>[github(http://github.comfooo)</p>" 
         (markdown/md-to-html-string "[github(http://github.comfooo)"))))

(deftest blockquote 
  (is (= "<blockquote><p>Foo bar baz </p></blockquote>"
         (markdown/md-to-html-string ">Foo bar baz"))))

(deftest escaped-characters
  (is
    (= "<p>&#42;&#8216;&#95;&#123;&#125;&#91;&#93;<em>foo</em><code>test</code><i>bar</i>{x}[y]</p>"
       (markdown/md-to-html-string "\\*\\`\\_\\{\\}\\[\\]*foo*`test`_bar_{x}[y]"))))

;(run-tests)

(ns mdtests
  (:require [markdown.core :as markdown]
            [markdown.transformers :as transformers]
            [markdown.tables :as tables]
            #?(:clj  [clojure.test :refer :all]
               :cljs [cljs.test :refer-macros [deftest is testing]])
            #?(:cljs [goog.string])))

(def entry-function
  #?(:clj markdown/md-to-html-string
     :cljs markdown/md->html))

(deftest heading1
  (is (= "<h1>Foo</h1>" (entry-function " # Foo")))
  (is (= "<h1>foo</h1>" (entry-function "#foo")))
  (is (= "<h1>foo</h1>" (entry-function "foo\n===")))
  (is (= "<h1>foo</h1>" (entry-function "#foo#")))
  (is (= "<h1>foo</h1>" (entry-function "#foo#\n")))
  (is (= "<h1>some header <code>with&#95;an&#95;underscore</code></h1>"
         (entry-function "# some header `with_an_underscore`"))))

(deftest heading2
  (is (= "<h2>foo</h2>" (entry-function "##foo")))
  (is (= "<h2>foo</h2>" (entry-function "foo\n---")))
  (is (= "<h2>foo</h2>" (entry-function "##foo##")))
  (is (= "<h2>foo</h2>" (entry-function "##foo##\n"))))

(deftest heading-with-complex-anchor
  (is (=
        "<h3><a name=\"foo&#95;bar&#95;baz\"></a>foo bar BAz</h3>some text"
        (entry-function "###foo bar BAz\nsome text" :heading-anchors true)))
  (is (=
        "<h3><a name=\"foo&#95;bar&#95;baz\"></a>foo bar BAz</h3>some text"
        (entry-function "###foo bar BAz##\nsome text" :heading-anchors true))))

(deftest br
  (is (= "<p>foo<br /></p>" (entry-function "foo  ")))
  (is (= "<pre><code>foo  \n</code></pre>bar" (entry-function "```\nfoo  \nbar```"))))

(deftest hr
  (is (= "<hr/>" (entry-function "***")))
  (is (= "<hr/>" (entry-function " * * * ")))
  (is (= "<hr/>" (entry-function " *****")))
  (is (= "<hr/>" (entry-function "- - - "))))

(deftest em
  (is (= "<p><em>foo</em></p>" (entry-function "*foo*"))))

(deftest italics
  (is (= "<p><i>foo</i></p>" (entry-function "_foo_"))))

(deftest strong
  (is (= "<p><strong>foo</strong></p>" (entry-function "**foo**"))))

(deftest bold
  (is (= "<p><b>foo</b></p>" (entry-function "__foo__"))))

(deftest strong-inside-em
  (is (= "<p><em>foo<strong>bar</strong>baz</em></p>" (entry-function "*foo**bar**baz*"))))

(deftest em-inside-strong
  (is (= "<p><strong>foo<em>bar</em>baz</strong></p>" (entry-function "**foo*bar*baz**"))))

(deftest paragraph
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</p>"
         (entry-function "\nLorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore"))))

(deftest paragraph-multiline
  (is (= "<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</p>"
         (entry-function "\nLorem ipsum dolor\nsit amet, consectetur adipisicing elit,\nsed do eiusmod tempor incididunt ut labore"))))

(deftest mulitple-paragraphs
  (is (= "<p>foo bar baz</p><p>foo bar baz</p>"
         (entry-function "\nfoo bar baz\n\n\nfoo bar baz"))))

(deftest ul
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul>"
         (entry-function "* foo\n* bar\n* baz")))
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul>"
         (entry-function "- foo\n- bar\n- baz")))
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul>"
         (entry-function "+ foo\n+ bar\n+ baz"))))

(deftest ul-followed-by-paragraph
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul><p>paragraph next line</p>"
         (entry-function "* foo\n* bar\n* baz\n\nparagraph\nnext line"))))

(deftest ul-followed-by-multiline-paragraph
  (is (= "<ul><li>foo</li><li>bar</li><li>baz</li></ul><p>paragraph</p>"
         (entry-function "* foo\n* bar\n* baz\n\nparagraph"))))

(deftest ul-nested
  (is (= "<ul><li>first item<ul><li>first sub-item<ul><li>second sub-item</li></ul></li><li>third sub-item</li></ul></li><li>second item<ul><li>first sub-item</li><li>second sub-item</li></ul></li><li>third item</li></ul>"
         (entry-function "* first item\n * first sub-item\n  * second sub-item\n * third sub-item\n* second item\n * first sub-item\n * second sub-item\n* third item")))
  (is (= "<ul><li>first item<ul><li>first sub-item<ul><li>second sub-item</li></ul></li><li>third sub-item</li></ul></li><li>second item<ul><li>first sub-item</li><li>second sub-item</li></ul></li><li>third item</li></ul>"
         (entry-function "* first item\n - first sub-item\n  - second sub-item\n - third sub-item\n* second item\n + first sub-item\n + second sub-item\n* third item")))
  (is (= "<ul><li>abc</li><li>def</li></ul>" (entry-function " * abc\n\n+ def"))))

(deftest ol
  (is (= "<ol><li>Foo</li><li>Bar</li><li>Baz</li></ol>"
         (entry-function "1. Foo\n2. Bar\n3. Baz"))))

(deftest ul-in-ol
  (is (= "<ol><li>Bar<ol><li>Subbar<ul><li>foo</li><li>bar</li><li>baz</li></ul></li></ol></li><li>Baz</li></ol>"
         (entry-function "1. Bar\n 2. Subbar\n  * foo\n  * bar\n  * baz\n3. Baz"))))

(deftest ol-in-ul
  (is (= "<ul><li>Foo<ol><li>Bar<ol><li>Subbar</li></ol></li></ol></li><li>Baz</li></ul>"
         (entry-function "* Foo\n 1. Bar\n  1. Subbar\n* Baz")))
  (is (= "<ul><li>Foo<ol><li>Bar</li></ol></li></ul>"
         (entry-function "* Foo\n 1. Bar"))))

(deftest multilist
  (is (=
        "<ul><li>foo</li><li>bar<ul><li>baz<ol><li>foo</li><li>bar</li></ol></li><li>fuzz<ul><li>blah</li><li>blue</li></ul></li></ul></li><li>brass</li></ul>"
        (entry-function
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
         (entry-function "foo bar baz `x = y + z;` foo")))
  (is (= "<p><code>&lt;?xml version='1.0' encoding='UTF-8'?&gt;&lt;channel&gt;&lt;/channel&gt;</code></p>"
         (entry-function "`<?xml version='1.0' encoding='UTF-8'?><channel></channel>`")))
  (is (= "<p>foo bar baz <code>&#40;fn &#91;x &amp; xs&#93; &#40;str &quot;x:&quot; x&#41;&#41;</code> foo</p>"
         (entry-function "foo bar baz `(fn [x & xs] (str \"x:\" x))` foo"))))

(deftest multiline-code
  (is (= "<pre><code>x = 5\ny = 6\nz = x + y</code></pre>"
         (entry-function "    x = 5\n    y = 6\n    z = x + y")))
  (is (= "<pre><code>x = 5\ny = 6\nz = x + y\n&#40;fn &#91;x &amp; xs&#93; &#40;str &quot;x&quot;&#41;&#41;</code></pre>"
         (entry-function "    x = 5\n    y = 6\n    z = x + y\n    (fn [x & xs] (str \"x\"))"))))

(deftest codeblock
  (is (= "<pre><code>&#40;defn- write &#91;writer text&#93;\n  &#40;doseq &#91;c text&#93;\n    &#40;.write writer &#40;int c&#41;&#41;&#41;&#41;\n</code></pre>"
         (entry-function "``` (defn- write [writer text]\n  (doseq [c text]\n    (.write writer (int c))))\n```")))
  (is (= "<pre><code>&#40;fn &#91;x &amp; xs&#93;\n  &#40;str &quot;x&quot;&#41;&#41;\n</code></pre>"
         (entry-function "``` (fn [x & xs]\n  (str \"x\"))\n```")))
  (is (= "<pre><code>&#40;fn &#91;x &amp; xs&#93;\n  &#40;str &quot;x&quot;&#41;&#41;\n</code></pre>"
         (entry-function "```\n(fn [x & xs]\n  (str \"x\"))\n```")))
  (is (= "<pre><code class=\"clojure\">&#40;fn &#91;x &amp; xs&#93;\n  &#40;str &quot;x&quot;&#41;&#41;\n</code></pre>"
         (entry-function "```clojure (fn [x & xs]\n  (str \"x\"))\n```")))
  (is (= "<pre><code class=\"nohighlight\">------------\n============\n    ------------\n    ============\n</code></pre>"
         (entry-function
           "
```nohighlight
------------
============
    ------------
    ============
```
"))))

(deftest stirkethrough
  (is (= "<p><del>foo</del></p>"
         (entry-function "~~foo~~"))))

(deftest superscript
  (is (= "<p>foo<sup>bar</sup> baz</p>"
         (entry-function "foo^bar baz"))))

(deftest link
  (is (= "<p><a href='http://github.com'>github</a></p>"
         (entry-function "[github](http://github.com)")))
  (is (= "<p><a href='http://github.com/~'>github</a></p>"
         (entry-function "[github](http://github.com/~)")))
  (is (= "<p><a href='http://github.com/^'>github</a></p>"
         (entry-function "[github](http://github.com/^)")))
  (is (= "<p><a href='http://github.com/*'>github</a></p>"
         (entry-function "[github](http://github.com/*)")))
  (is (= "<ul><li><a href='http://github.com/*'>github</a></li></ul>"
         (entry-function "* [github](http://github.com/*)")))
  (is (= "<ul><li>hi</li></ul><p><a href='https://see-here'>a link</a></p>"
         (entry-function "* hi\n\n[a link](https://see-here)")))
  (is (= "<p><a href=\"https://clojure.github.io/core.async/#clojure.core.async/%3E!\">&gt;!</a></p>"
         (entry-function "[>!](https://clojure.github.io/core.async/#clojure.core.async/>!)")))
  (is (= "<p><a href=\"https://clojure.github.io/core.async/#clojure.core.async/%3C!\">&lt;!</a></p>"
         (entry-function "[<!](https://clojure.github.io/core.async/#clojure.core.async/<!)"))))

(deftest styled-link
  (is (= "<p><a href='http://github.com'><em>github</em></a></p>"
         (entry-function "[*github*](http://github.com)")))
  (is (= "<p><a href='http://github.com'><i>github</i></a></p>"
         (entry-function "[_github_](http://github.com)")))
  (is (= "<p><a href='http://github.com'><b>github</b></a></p>"
         (entry-function "[__github__](http://github.com)")))
  (is (= "<p><a href='http://github.com'><strong>github</strong></a></p>"
         (entry-function "[**github**](http://github.com)")))
  (is (= "<p><a href='http://github.com'><del>github</del></a></p>"
         (entry-function "[~~github~~](http://github.com)"))))

(deftest img
  (is (= "<p><img src=\"/path/to/img.jpg\" alt=\"Alt text\" /></p>"
         (entry-function "![Alt text](/path/to/img.jpg)")))
  (is (= "<p><img src=\"/path/to/_img_.jpg\" alt=\"Alt text\" title=\"Optional Title\" /></p>"
         (entry-function "![Alt text](/path/to/_img_.jpg \"Optional Title\")"))))

(deftest img-link
  (is (= "<p><a href='http://travis-ci.org/yogthos/markdown-clj'><img src=\"https://secure.travis-ci.org/yogthos/markdown-clj.png\" alt=\"Continuous Integration status\" /></a></p>"
         (entry-function "[![Continuous Integration status](https://secure.travis-ci.org/yogthos/markdown-clj.png)](http://travis-ci.org/yogthos/markdown-clj)")))
  (is (= "<p><img src=\"https://secure.travis-ci.org/yogthos/markdown-clj.png\" alt=\"\" /></p>"
         (entry-function "![](https://secure.travis-ci.org/yogthos/markdown-clj.png)"))))

(deftest bad-link
  (is (= "<p>[github](http://github.comfooo</p>"
         (entry-function "[github](http://github.comfooo")))
  (is (= "<p>[github] no way (http://github.com)</p>"
         (entry-function "[github] no way (http://github.com)"))))

(deftest bad-link-title
  (is (= "<p>[github(http://github.comfooo)</p>"
         (entry-function "[github(http://github.comfooo)"))))

(deftest blockquote
  (is (= "<blockquote><p>Foo bar baz </p></blockquote>"
         (entry-function ">Foo bar baz"))))

(deftest blockquote-footer
  (is (= "<blockquote><p> Foo bar baz </p><footer> Leo Tolstoy</footer><p></p></blockquote>"
         (entry-function "> Foo bar baz\n>- Leo Tolstoy"))))

(deftest blockquote-empty-footer
  (is (= "<blockquote><p> Foo bar baz </p><footer></footer><p></p></blockquote>"
         (entry-function "> Foo bar baz\n>-"))))

(deftest blockquote-multiline-without-leading-angle-bracket
  (is (= "<blockquote><p> Foo bar baz </p></blockquote>"
         (entry-function "> Foo bar\nbaz"))))

(deftest blockquote-multiple-paragraphs
  (is (= "<blockquote><p> Foo bar </p><p> baz </p></blockquote>"
         (entry-function "> Foo bar\n>\n> baz"))))

(deftest escaped-characters
  (is
    (= "<p>&#42;&#8216;&#95;&#123;&#125;&#91;&#93;<em>foo</em><code>test</code><i>bar</i>{x}[y]</p>"
       (entry-function "\\*\\`\\_\\{\\}\\[\\]*foo*`test`_bar_{x}[y]"))))

(deftest paragraph-after-list
  (is (= "<ol><li>a</li><li>b</li></ol><p>test <strong>bold</strong> and <em>italic</em></p>"
         (entry-function "1. a\n2. b\n\ntest **bold** and *italic*"))))

(deftest paragraph-close-before-list
  (is (= "<p>in paragraph</p><ul><li>list</li></ul>"
         (entry-function "in paragraph\n- list"))))

(deftest autourl
  (is (= "<p><a href=\"http://example.com/\">http://example.com/</a></p>"
         (entry-function "<http://example.com/>")))

  (is (= "<p><a href=\"http://foo\">http://foo</a> <a href=\"https://bar/baz\">https://bar/baz</a> <a href=\"http://foo/bar\">foo bar</a></p>"
         (entry-function "<http://foo> <https://bar/baz> <a href=\"http://foo/bar\">foo bar</a>")))

  (is (= "<p><a href=\"mailto:abc@google.com\">abc@google.com</a></p>"
         (#?(:clj  org.apache.commons.lang.StringEscapeUtils/unescapeHtml
             :cljs goog.string/unescapeEntities)
           (entry-function "<abc@google.com>")))))

(deftest not-a-list
  (is (= "<p>The fish was 192.8 lbs and was amazing to see.</p>"
         (entry-function "The fish was\n192.8 lbs and was amazing to see."))))

(deftest dont-encode-chars-in-hrefs
  (is (= "<p><a href='http://www.google.com/example_link_foo~_^*'>example_link with tilde ~ and carat ^ and splat *</a></p>"
         (entry-function "[example_link with tilde ~ and carat ^ and splat *](http://www.google.com/example_link_foo~_^*)"))))

(deftest complex-link-with-terminal-encoding-inside-header
  (is (= "<h2>With a link <a href='http://a.com/under_score_in_the_link/'>the contents of the_link</a></h2>"
         (entry-function "##With a link [the contents of the_link](http://a.com/under_score_in_the_link/)"))))

(deftest two-links-tests-link-processing
  (is (= "<h2>When you have a pair of links <a href='http://123.com/1'>link1</a> and you want both <a href='That's crazy'>Wow</a></h2>"
         (entry-function "## When you have a pair of links [link1](http://123.com/1) and you want both [Wow](That's crazy)"))))

(deftest parse-table-row
  (is (= (tables/parse-table-row "| table cell contents |") [{:text "table cell contents"}]))
  (is (= (tables/parse-table-row "| contents 1 | contents 2 | contents 3 | contents 4 |")
         [{:text "contents 1"} {:text "contents 2"} {:text "contents 3"} {:text "contents 4"}])))

(deftest table-row->str
  (is (= (tables/table-row->str
           [{:text "contents 1"} {:text "contents 2"} {:text "contents 3"} {:text "contents 4"}]
           true)
         "<th>contents 1</th><th>contents 2</th><th>contents 3</th><th>contents 4</th>"))
  (is (= (tables/table-row->str
           [{:text "contents 1"} {:text "contents 2"} {:text "contents 3"} {:text "contents 4"}]
           false)
         "<td>contents 1</td><td>contents 2</td><td>contents 3</td><td>contents 4</td>"))
  (is (= (tables/table-row->str
           [{:text "contents 1" :alignment :left}
            {:text "contents 2" :alignment :center}
            {:text "contents 3" :alignment :right}
            {:text "contents 4"}]
           false)
         "<td align='left'>contents 1</td><td align='center'>contents 2</td><td align='right'>contents 3</td><td>contents 4</td>")))

(deftest table->str
  (is (= (tables/table->str
           {:alignment-seq
                  [{:alignment :left} {:alignment :center} {:alignment :right} {:alignment nil}]
            :data [[{:text "Header 1"}
                    {:text "Header 2"}
                    {:text "Header 3"}
                    {:text "Header 4"}]
                   [{:text "contents 1"}
                    {:text "contents 2"}
                    {:text "contents 3"}
                    {:text "contents 4"}]]})
         "<table><thead><tr><th align='left'>Header 1</th><th align='center'>Header 2</th><th align='right'>Header 3</th><th>Header 4</th></tr></thead><tbody><tr><td align='left'>contents 1</td><td align='center'>contents 2</td><td align='right'>contents 3</td><td>contents 4</td></tr></tbody></table>")))

(deftest divider-seq->alignment
  (is (= (tables/divider-seq->alignment
           [{:text "-----"} {:text ":-----"} {:text "-----:"} {:text ":-----:"}])
         [nil {:alignment :left} {:alignment :right} {:alignment :center}])))

(deftest n-dash
  (is (= "<p>boo &ndash; bar</p>" (entry-function "boo -- bar"))))

(deftest m-dash
  (is (= "<p>boo &mdash; bar</p>" (entry-function "boo --- bar"))))

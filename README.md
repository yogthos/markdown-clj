#Markdown parser written in Clojure

A markdown parser which compiles to both Clojure and ClojureScript.

[![Continuous Integration status](https://secure.travis-ci.org/yogthos/markdown-clj.png)](http://travis-ci.org/yogthos/markdown-clj)

## Demo

You can try out the parser [here](http://yogthos.net/markdown.html).

## Installation

Leiningen

```clojure
[markdown-clj "0.9.29"]
```

## Usage Clojure

Markdown-clj can be invoked either by calling `md-to-html` which takes two parameters, which will be passed to a reader and writer respectively, eg:

```clojure
(ns foo
  (:use markdown.core))
  
(md-to-html "input.md" "output.html")

(md-to-html (input-stream "input.md") (output-stream "test.txt"))
```
or by calling `md-to-html-string` which accepts a string with markdown content and returns a string with the resulting HTML:
```clojure
(md-to-html-string "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```")
```
```xml
<h1> This is a test</h1>some code follows<pre class="brush: clojure">
&#40;defn foo &#91;&#93;&#41;
</pre>
```

Finally, `md-to-html` and `md-to-html-string` can accept optional parameters:

Specifying `:heading-anchors` will create anchors for the heading tags, eg:

```clojure
(markdown/md-to-html-string "###foo bar BAz" :heading-anchors true)

```
```xml
<h3><a name=\"heading\" class=\"anchor\" href=\"#foo&#95;bar&#95;baz></a>foo bar BAz</h3>
```


Specifying `:code-style` will override the default code class formatting for code blocks, eg: 

```clojure
(md-to-html-string "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```" 
                   :code-style #(str "class=\"" % "\""))
```
```xml
<h1> This is a test</h1>some code follows<pre class="clojure">
&#40;defn foo &#91;&#93;&#41;
</pre>
```

Additional transformers can be specified using the `:custom-transformers` key. A transformer function must accept two arguments. First argument is the string representing the current line and the second is the map representing the current state.

For example, if we wanted to add a transformer that would capitalize all text we could do the following:

```clojure
(defn capitalize [text state]
  [(.toUpperCase text) state])

(markdown/md-to-html-string "#foo" :custom-transformers [capitalize])
```

```xml
<H1>FOO</H1>
```

Alternatively, you could provide a custom set of transformers to replace the default transformers using the `:replacement-transformers` key.

```clojure
(markdown/md-to-html-string "#foo" :replacement-transformers [capitalize])
```

## Usage ClojureScript

The ClojureScript portion works the same as above except that the entry function is called `mdToHtml`. It accepts
a string followed by the options as its input, and returns the resulting HTML string:

```clojure
(ns myscript
  (:require [markdown.core :as md]))

(.log js/console
  (md/mdToHtml "##This is a heading\nwith a paragraph following it"))

(.log js/console 
  (md/mdToHtml "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```" 
               :code-style #(str "class=\"" % "\"")))
```


## Supported syntax

Control characters can be escaped using \
```
\*
\`
\_
\(
\)
\[
\]
\{
\}
```

#### Basic Elements
[Blockquote](#blockquote),
[Strong](#strong),
[Bold](#bold),
[Emphasis](#emphasis),
[Italics](#italics),
[Heading](#heading),
[Line](#line),
[Linebreak](#linebreak),
[Paragraph](#paragraph),
[Strikethrough](#strikethrough)

#### Links
[Image](#image),
[Link](#link)


#### Lists
[Ordered List](#ordered-list),
[Unordered List](#unordered-list)

#### Code
[Code Block](#code-block),
[Indented Code](#indented-code),
[Inline Code](#inline-code)

***

### Heading

the number of hashes indicates the level of the heading

```
# Heading

##Sub-heading 

### Sub-sub-heading 
```

headings can also be defined using `=` and `-` for `h1` and `h2` respectively

```
Heading 1
=========

Heading 2
---------
```

### Line

```
***

* * *

*****

- - -
```

### Linebreak

If a line ends with two or more spaces a `<br />` tag will be inserted at the end.

### Emphasis

```
*foo*
```

### Italics

```
_foo_
```

### Strong

```
**foo**
```

### Bold

```
__foo__
```

### Blockquote
```
>This is a blockquote
with some content

>this is another blockquote
```

### Paragraph

```
This is a paragraph, it's
split into separate lines.

This is another paragraph.

```

### Unordered List

indenting an item makes it into a sublist of the item above it, ordered and unordered lists can be nested within one another. 
List items can be split over multiple lines.

```
* Foo
* Bar
 * Baz
```

```
* foo
* bar

   * baz
     1. foo
     2. bar
        more content 
        ## subheading 
        ***
        **strong text** in the list

   * fuzz

      * blah
      * blue
* brass
```

### Ordered List

```
1. Foo
2. Bar
3. Baz
```

### Inline Code

Any special characters in code will be escaped with their corresponding HTML codes. 

```
Here's some code `x + y = z` that's inlined.
```

### Code block

Using three backquotes indicates a start of a code block, the next three backquotes ends the code block section.
Optionally, the language name can be put after the backquotes to produce a tag compatible with the [Syntax Highlighter](http://alexgorbatchev.com/SyntaxHighlighter/), eg:

&#96;&#96;&#96;clojure

(defn foo [bar] "baz")

&#96;&#96;&#96;


### Indented Code

indenting by at least 4 spaces creates a code block

    some
    code 
    here

note: XML is escaped in code sections

### Strikethrough

```
~~foo~~
```

### Superscript

```
a^2 + b^2 = c^2
```

### Link
```
[github](http://github.com)
```

### Image
```
![Alt text](http://server/path/to/img.jpg)
![Alt text](/path/to/img.jpg "Optional Title")
```

### Image Link
```
[![Continuous Integration status](https://secure.travis-ci.org/yogthos/markdown-clj.png)](http://travis-ci.org/yogthos/markdown-clj)
```

## License

Copyright (C) 2012 Yogthos

Distributed under the Eclipse Public License, the same as Clojure.








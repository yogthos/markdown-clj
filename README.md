#Markdown parser written in Clojure

## Demo

You can try out the parser [here](https://rawgit.com/yogthos/markdown-clj/master/markdown.html).

## Installation

A markdown parser that compiles to both Clojure and ClojureScript.

[![Clojars Project](http://clojars.org/markdown-clj/latest-version.svg)](http://clojars.org/markdown-clj)

Note: `markdown-clj` requires Clojure 1.2+ to run.

## Usage Clojure

Markdown-clj can be invoked either by calling `md-to-html` or `md-to-html-string` functions.

The `md-to-html` function accepts an input containing Markdown markup and an output where
the resulting HTML will be written. The input and output parameters will be passed to a reader
and a writer respectively:

```clojure
(ns foo
  (:use markdown.core))

(md-to-html "input.md" "output.html")

(md-to-html (input-stream "input.md") (output-stream "test.txt"))
```

The `md-to-html-string` function accepts a string with markdown content and returns a string with the resulting HTML:

```clojure
(md-to-html-string "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```")
```
```xml
<h1> This is a test</h1>some code follows<pre class="brush: clojure">
&#40;defn foo &#91;&#93;&#41;
</pre>
```

Both `md-to-html` and `md-to-html-string` can accept optional parameters:

Specifying `:heading-anchors` will create anchors for the heading tags, eg:

```clojure
(markdown/md-to-html-string "###foo bar BAz" :heading-anchors true)

```
```xml
<h3><a name=\"heading\" class=\"anchor\" href=\"#foo&#95;bar&#95;baz\"></a>foo bar BAz</h3>
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

Additional transformers can be specified using the `:custom-transformers` key.
A transformer function must accept two arguments.
First argument is the string representing the current line and the second is the map representing the current state.

The default state keys are:

* `:code` - inside a code section
* `:codeblock` - inside a code block
* `:eof` - end of file
* `:heading` - in a heading
* `:hr` - in a horizontal line 
* `:lists` - inside a list
* `:blockquote` - inside a blockquote
* `:paragraph?` - in a paragraph?
* `:last-line-empty?` - was last line an empty line?

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

This can also be used to add preprocessor transformers. For example, if we wanted to sanitize any image links we could do the following:

```clojure
(use 'markdown.transformers 'markdown.core)

(defn escape-images [text state]
  [(clojure.string/replace text #"(!\[.*?\]\()(.+?)(\))" "") state])

(markdown/md-to-html-string
  "foo ![Alt text](/path/to/img.jpg \"Optional Title\") bar [text](http://test)"
  :replacement-transformers (cons escape-images transformer-vector))
```

```xml
"<p>foo  bar <a href='http://test'>text</a></p>"
```

## Usage ClojureScript

The ClojureScript portion works the same as above except that the entry function is called `md->html`. It accepts
a string followed by the options as its input, and returns the resulting HTML string:

```clojure
(ns myscript
  (:require [markdown.core :refer [md->html]]))

(.log js/console
  (md->html "##This is a heading\nwith a paragraph following it"))

(.log js/console
  (md->html "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```"
               :code-style #(str "class=\"" % "\"")))
```

## Usage JavaScript

```javascript
console.log(markdown.core.mdToHtml("##This is a heading\nwith a paragraph following it"));
```

## Supported syntax

Control characters can be escaped using \
```
\\ backslash
\` backtick
\* asterisk
\_ underscore
\{ curly braces
\}
\[ square brackets
\]
\( parentheses
\)
\# hash mark
\+ plus sign
\- minus sign (hyphen)
\. dot
\! exclamation mark
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

##### Automatic Links

This is a shortcut style for creating &#8220;automatic&#8221; links for URLs and email addresses: 

```
<http://example.com/>
```
will be turned this into:

```
<a href="http://example.com/">http://example.com/</a>
```

Automatic links for email addresses work similarly, except that they are hex encoded:

```
<address@example.com&>
```

will be turned into:

```
<a href=\"&#x61&#x64&#x64&#x72&#x65&#x73&#x73&#x40&#x65&#x78&#x61&#x6d&#x70&#x6c&#x65&#x2e&#x63&#x6f&#x6d\">&#x61&#x64&#x64&#x72&#x65&#x73&#x73&#x40&#x65&#x78&#x61&#x6d&#x70&#x6c&#x65&#x2e&#x63&#x6f&#x6d</a>
```

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

______
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
`>` prefixes regular blockquote paragraphs.  `>-` prefixes a
blockquote footer that can be used for author attribution.

```
>This is a blockquote
with some content

>this is another blockquote

> Everyone thinks of changing the world,
but no one thinks of changing himself.
>- Leo Tolstoy
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

## Limitations

The parser reads the content line by line, this means that tag content is not allowed to span multiple lines.

## License

Copyright (C) 2012 Yogthos

Distributed under the Eclipse Public License, the same as Clojure.








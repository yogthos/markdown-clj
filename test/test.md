#Markdown parser written in Clojure

A markdown parser that compiles to both Clojure and ClojureScript.

[![Continuous Integration status](https://secure.travis-ci.org/yogthos/markdown-clj.png)](http://travis-ci.org/yogthos/markdown-clj)

## Installation

Leiningen

!["Leiningen version"](https://clojars.org/markdown-clj/latest-version.svg)

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

```xml
<h1> This is a test</h1>some code follows<pre class="brush: clojure">
&#40;defn foo &#91;&#93;&#41;
</pre>
```

The default state keys are:

* `:code` - inside a code section
* `:codeblock` - inside a code block
* `:eof` - end of file
* `:heading` - in a heading
* `:hr` - in a horizontal line
* `:lists` - inside a list
* `:blockquote` - inside a blockquote
* `:paragraph` - in a paragraph
* `:last-line-empty?` - was last line an empty line?

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

# Heading

##Sub-heading

### Sub-sub-heading

Heading 1
=========

Heading 2
---------

***

* * *

*****

- - -

______

If a line ends with two or more spaces a `<br />` tag will be inserted at the end.

*emph* _italics_ **strong** __bold__ ~~strike~~ a^2 + b^2 = c^2

>This is a blockquote
with some content

>this is another blockquote

This is a paragraph, it's
split into separate lines.

This is another paragraph.

* Foo
* Bar
 * Baz

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

1. Foo
2. Bar
3. Baz

Here's some code `x + y = z` that's inlined.

```
(defn foo [bar] "baz")
```

indenting by at least 4 spaces creates a code block

    some
    code
    here

note: XML is escaped in code sections

[github](http://github.com)

![Alt text](http://server/path/to/img.jpg)
![Alt text](/path/to/img.jpg "Optional Title")

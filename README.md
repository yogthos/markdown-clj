# Markdown parser written in Clojure/Script

[![CircleCI](https://circleci.com/gh/yogthos/markdown-clj.svg?style=svg)](https://circleci.com/gh/yogthos/markdown-clj) [![Downloads](https://jarkeeper.com/yogthos/markdown-clj/downloads.svg)](https://jarkeeper.com/yogthos/markdown-clj)

## Demo

You can try out the parser [here](https://rawgit.com/yogthos/markdown-clj/master/demo/markdown.html).

## Installation

A markdown parser that compiles to both Clojure and ClojureScript.

[![Clojars Project](http://clojars.org/markdown-clj/latest-version.svg)](http://clojars.org/markdown-clj)

Note: `markdown-clj` versions prior to `0.9.68` requires Clojure 1.2+ to run, versions `0.9.68+` require Clojure 1.7.

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
<h1> This is a test</h1>some code follows<pre><code class="clojure">&#40;defn foo &#91;&#93;&#41;
</code></pre>
```

Both `md-to-html` and `md-to-html-string` accept optional parameters:

Specifying `:heading-anchors` will create anchors for the heading tags, eg:

```clojure
(markdown/md-to-html-string "###foo bar BAz" :heading-anchors true)

```
```xml
<h3 id=\"foo&#95;bar&#95;baz\">foo bar BAz</h3>
```

The code blocks default to a [highlight.js](https://highlightjs.org/) compatible format of:
```xml
<pre><code class="clojure">some code</code></pre>
```

Specifying `:code-style` will override the default code class formatting for code blocks, eg:

```clojure
(md-to-html-string "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```"
                   :code-style #(str "class=\"brush: " % "\""))
```
```xml
<h1> This is a test</h1>some code follows<pre><code class="brush: clojure">
&#40;defn foo &#91;&#93;&#41;
</code></pre>
```

### reference style links

The parser defaults to using inline reference for performance reasons, to enable reference style links pass in the `:reference-links? true` option:

```clojure
(md-to-html-string
  "This is [an example][id] reference-style link.

   [id]: http://example.com/ 'Optional Title Here'"
   :reference-links? true)
```

### footnotes

To enable footnotes, pass the `:footnotes? true` option:

```clojure
(md-to-html-string
  "Footnotes will appear automatically numbered with a link to the footnote at bottom of the page [^footnote1].

  [^footnote1]: The footnote will contain a back link to to the referring text."
  :footnotes? true)
```

### Metadata

The metadata encoded using the syntax described by [MultiMarkdown](https://github.com/fletcher/MultiMarkdown/wiki/MultiMarkdown-Syntax-Guide#metadata) can be optionally extracted from the document.

The `md-to-html` function will attempt to parse the metadata when passed the `:parse-meta? true` option and return it as its output.
Additionally, `md-to-html-string-with-meta` function can be used to parse string input. The function returns a map with two keys, `:html` containing the parsed HTML, and `:metadata` containing a map with the metadata included at the top of the document.

The value of each key in the metadata map will be a list of either 0, 1 or many strings. If a metadata value ends in two spaces then the string will end in a newline. If a line does not contain a header and has at least 4 spaces in front of it then it will be considered to be a member of the last key that was found.

```clojure
(let [input    (new StringReader text)
      output   (new StringWriter)
      metadata (md-to-html input output :parse-meta? true)
      html     (.toString output)]
  {:metadata metadata :html html})

(md-to-html-string-with-meta
  "Author: Rexella van Imp
    Kim Jong-un
Date: October 31, 2015

   # Hello!")

{:metadata {:author ["Rexella van Imp"
                     "Kim Jong-un"],
            :date ["October 31, 2015"]},
 :html "<h1>Hello!</h1>"}
```

### Selectively inhibiting the Parser

If you pass `:inhibit-separator "some-string"`, then any text within occurrences of `some-string` will be output verbatim, eg:

```clojure
(md-to-html-string "For all %$a_0, a_1, ..., a_n in R$% there is _at least one_ %$b_n in R$% such that..."
                   :inhibit-separator "%")
```
```xml
For all $a_0, a_1, ..., a_n in R$ there is <i>at least one</i> $b_n in R$ such that...
```

This may be useful to use `markdown-clj` along with other parsers of languages with conflicting syntax (e.g. asciimath2jax).

If you need to output the separator itself, enter it twice without any text inside.  Eg:

```clojure
(md-to-html-string "This is one of those 20%% vs 80%% cases."
                   :inhibit-separator "%")
```
```xml
This is one of those 20% vs 80% cases.
```

Some caveats:

- Like other tags, this only works within a single line.

- If you remove the default transformers with `:replacement-transformers` (which see below), inhibiting will stop working.

- Currently, dashes (`--` and `---`) can't be suppressed this way.

## Customizing the Parser

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
* `:paragraph` - in a paragraph
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

This can also be used to add preprocessor transformers. For example, if we wanted to sanitize any image links and escape HTML we could do the following:

```clojure
(use 'markdown.transformers 'markdown.core)

(defn escape-images [text state]
  [(clojure.string/replace text #"(!\[.*?\]\()(.+?)(\))" "") state])

(defn escape-html
    "Change special characters into HTML character entities."
    [text state]
    [(if-not (or (:code state) (:codeblock state))
       (clojure.string/escape
         text
         {\& "&amp;"
          \< "&lt;"
          \> "&gt;"
          \" "&quot;"
          \' "&#39;"})
       text) state])
       
(markdown/md-to-html-string
  "<h1>escaped</h1>foo ![Alt text](/path/to/img.jpg \"Optional Title\") bar [text](http://test)"
  :replacement-transformers (into [escape-images escape-html] transformer-vector))
```

```xml
"<p>&lt;h1&gt;escaped&lt;/h1&gt;foo  bar <a href='http://test'>text</a></p>"
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

(md->html-with-meta "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```")
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
[Bold-Italic](#bold-italic),
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

### Bold-Italic
```
***bold italic***
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
Optionally, the language name can be put after the backquotes to produce a tag compatible with [highlight.js](https://highlightjs.org/), eg:

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

##### Reference Link

```
This is [an example][id] reference-style link.

[id]: http://example.com/  "Optional Title Here"
```

note: reference links require the `:reference-links?` option to be set to true

### Footnote

```
"Footnotes will appear automatically numbered with a link to the footnote at bottom of the page [^footnote1].
[^footnote1]: The footnote will contain a back link to to the referring text."
```

note: to enable footnotes, the `:footnotes?` option must be set to true.

### Image
```
![Alt text](http://server/path/to/img.jpg)
![Alt text](/path/to/img.jpg "Optional Title")
```

##### Image Reference

```
This is ![an example][id] reference-style image descriptor.

[id]: http://example.com/  "Optional Title Here"
```

note: reference links require the `:reference-links?` option to be set to true


### Image Link
```
[![Continuous Integration status](https://secure.travis-ci.org/yogthos/markdown-clj.png)](http://travis-ci.org/yogthos/markdown-clj)
```

### Table

You can create tables by assembling a list of words and dividing them with hyphens - (for the first row), and then separating each column with a pipe |:

```
| First Header  | Second Header |
| ------------- | ------------- |
| Content Cell  | Content Cell  |
| Content Cell  | Content Cell  |
```

By including colons : within the header row, you can define text to be left-aligned, right-aligned, or center-aligned:

```
| Left-Aligned  | Center Aligned    | Right Aligned |
| :------------ | :---------------: | ------------: |
| col 3 is      |  some wordy text  | $1600         |
| col 2 is      |  centered         |   $12         |
| zebra stripes |  are neat         |    $1         |
```

A colon on the left-most side indicates a left-aligned column; a colon on the right-most side indicates a right-aligned column; a colon on both sides indicates a center-aligned column.


## Limitations

The parser reads the content line by line, this means that tag content is not allowed to span multiple lines.

## License

Copyright © 2015 Dmitri Sotnikov

Distributed under the Eclipse Public License, the same as Clojure.

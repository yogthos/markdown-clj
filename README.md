#Markdown parser written in Clojure

A markdown parser which compiles to both Clojure and ClojureScript.

## Installation

Leiningen

```clojure
[markdown-clj "0.9.11"]
```

Maven

```xml
<dependency>
  <groupId>markdown-clj</groupId>
  <artifactId>markdown-clj</artifactId>
  <version>0.9.11</version>
</dependency>
```

## Building

To build the Clojure jar 

```bash
lein install
```

To compile the ClojureScript portion

```bash
lein cljsbuild once
```

## Usage

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
<h1> This is a test</h1>some code follows<pre><code class="brush: clojure;">
&#40;defn foo &#91;&#93;&#41;
</code></pre>
```

Finally, `md-to-html` and `md-to-html-string` can accept optional parameters, currently `:code-style` is supported.
Specifying `:code-style` will override the default code class formatting for code blocks, eg: 

```clojure
(md-to-html-string "# This is a test\nsome code follows\n```clojure\n(defn foo [])\n```" 
                   :code-style #(str "class=\"" % "\""))
```
```xml
<h1> This is a test</h1>some code follows<pre><code class="clojure">
&#40;defn foo &#91;&#93;&#41;
</code></pre>
```

## Supported syntax

Control characters can be escaped using \
```
\*
\`
\_
```

#### Basic Elements
[Blockquote](#blockquote),
[Bold](#bold),
[Emphasis](#emphasis),
[Heading](#heading),
[Italics](#italics),
[Line](#line),
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

### Line

```
***

* * *

*****

- - -
```

### Emphasis

```
*foo*
```

### Italics

```
_foo_
```

### Bold

```
**foo**
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
        **bold text** in the list

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

## License

Copyright (C) 2012 Yogthos

Distributed under the Eclipse Public License, the same as Clojure.








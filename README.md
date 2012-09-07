#Markdown parser written in Clojure

A markdown parser which compiles to both Clojure and ClojureScript.

## Installation

Leiningen

```clojure
[markdown-clj "0.9.8"]
```

Maven

```xml
<dependency>
  <groupId>markdown-clj</groupId>
  <artifactId>markdown-clj</artifactId>
  <version>0.9.8</version>
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
#Heading

##Sub-heading 

###Sub-sub-heading 
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

indenting an item makes it into a sublist of the item above it, ordered and unordered lists can be nested within one another

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








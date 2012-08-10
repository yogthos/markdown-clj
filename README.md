#Markdown parser written in Clojure

A markdown parser which compiles to both Clojure and ClojureScript.

## Installation

Leiningen

```clojure
[markdown-clj "0.9.5"]
```

Maven

```xml
<dependency>
  <groupId>markdown-clj</groupId>
  <artifactId>markdown-clj</artifactId>
  <version>0.9.5</version>
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

using three backquotes indicates a start of a code block, the next three backquotes ends the code block section.

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
![alt](http://server/path/to/img.jpg)
![Alt text](/path/to/img.jpg "Optional Title")
```

## License

Copyright (C) 2012 Yogthos

Distributed under the Eclipse Public License, the same as Clojure.








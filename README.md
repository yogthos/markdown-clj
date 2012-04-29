#Markdown parser written in Clojure

## Installation

Leiningen

```
[markdown-clj "0.6"]
```

Maven

```
<dependency>
  <groupId>markdown-clj</groupId>
  <artifactId>markdown-clj</artifactId>
  <version>0.6</version>
</dependency>
```


## Supported syntax

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

### Inline code 

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









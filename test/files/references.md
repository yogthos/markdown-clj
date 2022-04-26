
[id]: http://example.com/  "Optional Title Here"

You can optionally use a space to separate the sets of brackets:

This is [an example] [id] reference-style link.

This *is* [an example] [id] reference-style link.

This is [an example][id] reference-style link.

This is [an example][id1] reference-style link.

This is [an/example][id1] reference-style link.

This is [an'example][id1] reference-style link.

This is an implicit reference-style link to [id1][].

Then, anywhere in the document, you define your link label like this, on a line by itself:

This is [an example][id-2] reference-style link.

This is [an example][id3] reference-style link.

A link with [an underscore][underscore].

A link with a [complex reference][\refs:complex/1].

[id1]: http://example.com/  'Optional Title Here'

[id-2]: http://example.com/  (Optional Title Here)

[id3]: http://example.com/

[underscore]: http://example.com/#_a_b

[\refs:complex/1]: http://example.com/

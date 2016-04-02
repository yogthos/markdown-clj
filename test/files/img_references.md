[id]: http://example.com/  "Optional Title Here"

You can optionally use a space to separate the sets of brackets:

This is ![an example] [id] reference-style image descriptor.

This is ![an example][id] reference-style image descriptor.

This is ![an example][id1] reference-style image descriptor.

This is ![an/example][id1] reference-style image descriptor.

This is ![an'example][id1] reference-style image descriptor.

Then, anywhere in the document, you define your image descriptor label like this, on a line by itself:

This is ![an example][id2] reference-style image descriptor.

This is ![an example][id3] reference-style image descriptor.

A image descriptor with ![an underscore][underscore].

[id1]: http://example.com/  'Optional Title Here'

[id2]: http://example.com/  (Optional Title Here)

[id3]: http://example.com/

[underscore]: http://example.com/#_a_b


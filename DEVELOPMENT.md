# esfixup Development

## Structure of this Package

TODO

## Developing a Babel Plugin

Most of the transforms we have are actually Babel Plugins, so docs you find
on how to write those, and the API to use, should work fine.  Here are some
good references:

* [Babel Plugin Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) - a good introduction
* [@babel/types API](https://babeljs.io/docs/en/babel-types) - what's available
  to you in the `t` variable in most plugins
* [AST Explorer](https://astexplorer.net/) - an interactive tool to help write
  plugin transformers (HIGHLY recommended)

## Manually Testing a Single Plugin

Most of the files that live in a directory named `transforms/` are actually
valid Babel plugins.  If their `modules.exports` is a function which takes
`{ types: t }` and returns an object like `{ visitor: { ... } }`, then that's
almost certainly one.  In that case, you can test them directly by running
the babel CLI itself.

For example if we want to try out the [`global-url`][global-url] js
sub-transform:

```
$ cat ~/foo.js
'use strict';

const { URL } = require('url');

const url = new URL();

$ npx babel \
  --no-babelrc \
  --plugins ./lib/transforms/js/transforms/global-url.js \
  < ~/foo.js
'use strict';

const url = new URL();
```

[global-url]: lib/transforms/js/transforms/global-url.js
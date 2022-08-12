# `esfixup`

> CLI to transform/port/upgrade/improve your existing JavaScript (or convert
Coffee to JS)

## Usage

```bash
npx esfixup --help
npx esfixup --transforms=decaf *.coffee lib
npx esfixup --transforms=js,testium-wd modules
```

## Options

### `--no-lint-fix`

Don't run `eslint --fix` (using your lint settings) on any JS files when
complete.  (Default JS output is pretty ugly, you probably don't want this).

### `--node-version`

Explicitly specify a compatible version of JS that should be generated - by
default this is inferred from the `engines.node` section of your `package.json`

### `--transforms` or `-t`

Comma-separated list of which transforms you want to apply; order given in
option is ignored; transforms know which order they should be applied in.

Available transforms include:

#### `assert`
Converts uses of [assertive] to modern builtin NodeJS [assert].

File type: `*.js`

[assertive]: https://github.com/groupon/assertive
[assert]: https://nodejs.org/dist/latest/docs/api/assert.html

Assertive was great in its day, but mostly NodeJS `assert` has caught up, and
is much more standard.

Example:

```js
const { equal } = require('assertive');
equal('expected', 'actual');
```

```
$ npx esfixup --transforms=assert foo.js
[assert] ✏️  foo.js
```

```js
const assert = require('assert');
assert.strictEqual('actual', 'expected');
```

#### `decaf`
Decaffeinate single files or entire folders - tries to convert to idiomatic
JavaScript where possible, which means it may not always be a 100% faithful
conversion.

File type: `*.coffee`

Example:

```coffee
# foo.coffee
x = 20
y = 10
y = 30
```

```
$ npx esfixup --transforms=decaf foo.coffee
[decaf] ✏️  foo.coffee → foo.js
```

```js
// foo.js
'use strict';

const x = 20;
let y = 10;
y = 30;
```

#### `js`
Upgrades JS/ES Syntax to maximum features available for your NodeJS version

File type: `*.js`

Included features:

* `Object.assign({}, a, b)` replaced with object-spread: `{ ...a, ...b }`
* Uses of `bluebird.coroutine` and `co.wrap` replaced with async/await
* Uses object & array destructuring in function and assignments where possible
* Replaces `.indexOf(x) !== -1` with `.includes()`
* Removes unnecessary `const { URL } = require('url');`
* Removes unused `catch` clause parameter
* Replaces `[].concat.apply()` construct with `.flat()`
* Replaces `a && a.b && a.b.c` sort of stuff with optional chaining: `a?.b?.c`
* Removes `__guard__` constructs introduced by `--transforms=decaf`

#### `nodash`
Replace some uses of lodash with ES6+ code

File type: `*.js`

Notes:
- After applying, rigorously test your code
- Some transforms are very complex. If possible, try to avoid lodash usage in
  the first place.
- Transforms currently happen in place.  Refactor your code afterwards to not
  replicate code.

This will replace some uses of:

* assign
* compact
* concat
* difference
* drop
* fill
* head
* first
* initial
* intersection
* join
* keys
* last
* take
* takeRight
* toPairs
* without
* uniq
* union
* unzip
* values
* zip
* zipObject

#### `phy`
Converts boring `h()` or jsx calls to [phy] `h()` calls

[phy]: https://github.com/groupon/phy

File type: `*.jsx`, `*.js`

Example:

```jsx
// foo.jsx
const { h } = require('preact');

function SomeComp() {
  return <div class="a"><b>stuff</b></div>;
}
function OtherComp() {
  return h('div', { className: 'a' }, [h('b', {}, ['stuff'])]);
}
```

```
$ npx esfixup --transforms=phy foo.jsx
[phy] ✏️  foo.jsx → foo.js
```

```js
// foo.js
const h = require('phy');

function SomeComp() {
  return h('.a', h('b', 'stuff'));
}

function OtherComp() {
  return h('.a', [h('b', ['stuff'])]);
}
```

#### `testium-wd`
Converts testium-driver-sync tests to testium-driver-wd

File type: `*.js`

```js
const injectBrowser = require('testium/mocha');

describe('x', () => {
  before(injectBrowser({ driver: 'sync' }));
  it('y', function () {
    this.browser.navigateTo('/');
    return this.browser.waitForElementVisible('#a');
  });
  it('checks', () => {
    browser.assert.httpStatus(204);
  });
  it('z', () => {
    browser.navigateTo('/z');
    assert.equal(200, browser.getStatusCode());
    browser.assert.elementIsVisible('#a');
    assert.expect(true);
    browser.setCookie({ domain: 'd' });
  });
});
```

```
$ npx esfixup --transforms=testium-wd some.test.js
[testium-wd] ✏️  some.test.js
```

```js
const { browser } = require("testium-mocha");

describe('x', () => {
  before(browser.beforeHook({ driver: 'wd' }));
  it('y', () =>
    browser
      .loadPage('/', { expectedStatusCode: 204 })
      .waitForElementDisplayed('#a')
  );

  it('z', async () => {
    await browser
      .loadPage('/z')
      .assertElementIsDisplayed('#a');
    assert.expect(true);
    await browser.setCookie({ domain: 'd' });
  });
});
```

#### `ts`

File type: `*.js`

Transforms JavaScript with optional TS-compatible JSDoc comments into idiomatic
TypeScript.  Sadly most other transforms currently only operate on JavaScript,
so this transform will run last.

Example:

```js
// foo.js
/**
 * @param {string} a
 * @param {import('./foo').Foo} [b]
 * @return {number}
 */
function fn(a, b) {
  return a + (b ? b.toNum() : 42);
}
```

```
$ npx esfixup --transforms=ts foo.js
[ts] ✏️  foo.js → foo.ts
```

```ts
// foo.ts
import { Foo } from './foo';

function fn(a: string, b?: Foo): number {
  return a + (b ? b.toNum() : 42);
}
```

## Development

For work on this library, see [DEVELOPMENT.md](DEVELOPMENT.md)
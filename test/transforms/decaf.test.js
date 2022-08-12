'use strict';

const { AssertionError } = require('assert');

const decaf = require('../../lib/transforms/decaf');

const TEST_CASES = {
  'const and let': [
    'x = 20\ny = 10\ny = 30\n',
    'const x = 20;\nlet y = 10;\ny = 30;\n',
  ],
  'simple function': [
    'f = (x) -> x * 2\n',
    'function f(x) {\n  return x * 2;\n}\n',
  ],
  'function in function': [
    'wrap = ->\n  m = => @x\n  g = ->\n  g(done)\n',
    'function wrap() {\n  const m = () => this.x;\n\n  function g() {}\n\n  g(done);\n}\n',
  ],
  'multi-expression function': [
    'f = (x) ->\n  y = x * 2\n  y\n',
    'function f(x) {\n  const y = x * 2;\n  return y;\n}\n',
  ],
  'named module exports': [
    'x = 4\nf = module.exports = -> x\n',
    'const x = 4;\n\nfunction f() {\n  return x;\n}\n\nmodule.exports = f;\n',
  ],
  'named module exports (reverse)': [
    'x = 4\nmodule.exports = f = -> x\n',
    'const x = 4;\n\nfunction f() {\n  return x;\n}\n\nmodule.exports = f;\n',
  ],
  'named-module-exports-prop': [
    'module.exports.f = -> 2\n',
    'function f() {\n  return 2;\n}\n\nmodule.exports.f = f;\n',
  ],
  'named-exports-prop': [
    'exports.f = -> 2\n',
    'function f() {\n  return 2;\n}\n\nexports.f = f;\n',
  ],
  'simple class': [
    'class A\n  constructor: ->\n    @x = 42\n  getX: -> @x\n',
    'class A {\n  constructor() {\n    this.x = 42;\n  }\n  getX() {\n    return this.x;\n  }\n}\n',
  ],
  'class with inheritance': [
    'class A extends B\n  constructor: ->\n    super()\n',
    'class A extends B {\n  constructor() {\n    super();\n  }\n}\n',
  ],
  'class with implicit super in c-tor': [
    // This is actually broken code
    'class A extends B\n  constructor: ->\n    @x = 42\n',
    'class A extends B {\n  constructor() {\n    this.x = 42;\n  }\n}\n',
  ],
  'class with implicit c-tor': [
    'class A extends B\n',
    'class A extends B {}\n',
  ],
  'split assign and return': [
    'x = {}\nf = ->\n  x.p = 2\n',
    'const x = {};\n\nfunction f() {\n  x.p = 2;\n  return x.p;\n}\n',
  ],
  'for loop over array': [
    'for x in arr\n  console.log(x)\n',
    'for (let x of arr) {\n  console.log(x);\n}\n',
  ],
  'for loop over array with continue': [
    'for x in arr\n  continue if x\n',
    'for (let x of arr) {\n  if (x) {\n    continue;\n  }\n}\n',
  ],
  'for loop over array with break': [
    'for x in arr\n  break if x\n',
    'for (let x of arr) {\n  if (x) {\n    break;\n  }\n}\n',
  ],
  'for loop with destructuring': [
    'for {x, y} in arr\n  console.log(x, y)\n',
    'for (let {\n  x,\n  y\n} of arr) {\n  console.log(x, y);\n}\n',
  ],
  'spread all arguments': ['f x...\n', 'f(...Array.from(x || []));\n'],
  'spread some arguments': ['f a, b, x...\n', 'f(a, b, ...Array.from(x));\n'],
  'rest all arguments': [
    'f = (args...) -> args\n',
    'function f(...args) {\n  return args;\n}\n',
  ],
  'rest some arguments': [
    'f = (a, b, args...) -> args\n',
    'function f(a, b, ...args) {\n  return args;\n}\n',
  ],
  'forwarding all arguments': [
    'g = (args...) ->\n  x = 2\n  f args...\n',
    'function g(...args) {\n  const x = 2;\n  return f(...Array.from(args || []));\n}\n',
  ],
  'forwarding all but shifted arguments': [
    'g = (args...) ->\n  x = 2\n  f x, args...\n',
    'function g(...args) {\n  const x = 2;\n  return f(x, ...Array.from(args));\n}\n',
  ],
  'forwarding mutated arguments': [
    'g = (args...) ->\n  args[0] = 2\n  f args...\n',
    'function g(...args) {\n  args[0] = 2;\n  return f(...Array.from(args || []));\n}\n',
  ],
  'forwarding some arguments': [
    'g = (a, b, args...) ->\n  y = 42\n  f y, args...\n',
    'function g(a, b, ...args) {\n  const y = 42;\n  return f(y, ...Array.from(args));\n}\n',
  ],
  'last arg defaults to empty object': [
    'f = (a, opts = {}) -> opts.x\n',
    'function f(a, opts = {}) {\n  return opts.x;\n}\n',
  ],
  'last arg defaults to empty array': [
    'f = (a, opts = []) -> opts[0]\n',
    'function f(a, opts = []) {\n  return opts[0];\n}\n',
  ],
  'last method arg defaults to empty object': [
    'class C\n  constructor: (a, opts = {}) ->\n  m: (b, opts = []) ->\n',
    [
      'class C {',
      '  constructor(a, opts = {}) {}',
      '  m(b, opts = []) {}',
      '}',
      '',
    ].join('\n'),
  ],
  'last object arg defaults to empty object': [
    'obj =\n  f: (a, opts = {}) ->\n  m: (b, opts = []) ->\n',
    [
      'const obj = {',
      '  f(a, opts = {}) {},',
      '  m(b, opts = []) {}',
      '};',
      '',
    ].join('\n'),
  ],
  'extract one thing from a require call': [
    "{x} = require('x')\n",
    "const {\n  x\n} = require('x');\n",
  ],
  'extract one thing from a require call and rename it': [
    "{x: y} = require('x')\n",
    "const {\n  x: y\n} = require('x');\n",
  ],
  'extract one thing from an arbitray call': [
    '{x} = myFn()\n',
    'const {\n  x\n} = myFn();\n',
  ],
  'extract one thing from an arbitray call and rename it': [
    '{x: y} = myFn()\n',
    'const {\n  x: y\n} = myFn();\n',
  ],
  'describe and it not returned': [
    "describe 'a', ->\n  describe 'b', ->\n    it 'c', ->\n",
    "describe('a', () => {\n  describe('b', () => {\n    it('c', function () {});\n  });\n});\n",
  ],
  'last line in describe not returned': [
    "describe 'a', ->\n  describe 'b'\n  describe 'c'\n",
    "describe('a', function () {\n  describe('b');\n  describe('c');\n});\n",
  ],
  'it with callback no return': [
    "it 'does stuff', (anything) ->\n  x = 42\n  f()\n",
    "it('does stuff', function (anything) {\n  const x = 42;\n  f();\n});\n",
  ],
  'it with callback no return, simple': [
    "it 'does stuff', (anything) -> f()\n",
    "it('does stuff', anything => {\n  f();\n});\n",
  ],
  'return from callback with then': [
    'fn = ->\n  x().then(y, (err) -> err)\n',
    'function fn() {\n  return x().then(y, err => err);\n}\n',
  ],
  'return from callback with catch': [
    'fn = ->\n  x().catch((err) -> err)\n',
    'function fn() {\n  return x().catch(err => err);\n}\n',
  ],
  'library extractions': [
    "{a: x, b} = require './some/path/my-helpers.js'\n",
    "const {\n  a: x,\n  b\n} = require('./some/path/my-helpers.js');\n",
  ],
  'lodash helpers': [
    "{map: lmap, each} = require 'lodash'\n",
    'const lmap = require("lodash/map");\n\nconst each = require("lodash/each");\n',
  ],
  'single array extraction': [
    '[a] = str.match(p)\n',
    'const [a] = str.match(p);\n',
  ],
  'multi array extraction': [
    '[a, b] = str.match(p)\n',
    'const [a, b] = str.match(p);\n',
  ],
  'array extraction from id': ['[a, b] = x\n', 'const [a, b] = x;\n'],
  'object extraction from id': [
    '{a: c, b} = obj\n',
    'const {\n  a: c,\n  b\n} = obj;\n',
  ],
  'foo/bar/unnamed-main.js': [
    'module.exports = -> 2',
    'function unnamedMainJs() {\n  return 2;\n}\n\nmodule.exports = unnamedMainJs;\n',
  ],
  'foo/bar/unnamed-main-clash.js': [
    'unnamedMainClashJs = "foo"\nmodule.exports = -> 2',
    'const unnamedMainClashJs = "foo";\n\nfunction _unnamedMainClashJs() {\n  return 2;\n}\n\nmodule.exports = _unnamedMainClashJs;\n',
  ],
  'extract from @call': [
    // Needs to be wrapped so `this` does work (disallowed top-level)
    'setImmediate ->\n  {time, source} = @getCurrentWithMetaData();\n  null\n',
    [
      'setImmediate(function () {',
      '  const {\n    time,\n    source\n  } = this.getCurrentWithMetaData();',
      '  return null;',
      '});',
      '',
    ].join('\n'),
  ],
  'before/after with assignments': [
    ["before -> process.env = 'test'", ''].join('\n'),
    ['before(() => {', "  process.env = 'test';", '});', ''].join('\n'),
  ],
  'before/after with assignments as last statement': [
    ['before ->', '  someCall()', "  process.env = 'test'", ''].join('\n'),
    [
      'before(function () {',
      '  someCall();',
      "  process.env = 'test';",
      '});',
      '',
    ].join('\n'),
  ],
  'returning mocha / test stuff': [
    [
      'a = ->\n  expect(3).to.eql(2)\n  expect().to.throw',
      'b = -> assert.rejects(42)',
      'c = -> assert.equal(2 + 2, 4)',
      'd = ->\n  assert.expect(true)\n  assert.expect(!false)',
      'e = -> it($, -> assert.expect(true))',
      'f = -> before(0)',
      'g = -> beforeEach(0)',
      'h = ->\n  before(0)\n  after(1)',
      'i = ->\n  beforeEach(0)\n  afterEach(1)',
    ].join('\n'),
    [
      'function a() {\n  expect(3).to.eql(2);\n  expect().to.throw;\n}\n',
      'function b() {\n  return assert.rejects(42);\n}\n',
      'function c() {\n  assert.equal(2 + 2, 4);\n}\n',
      'function d() {\n  assert.expect(true);\n  assert.expect(!false);\n}\n',
      'function e() {\n  it($, () => {\n    assert.expect(true);\n  });\n}\n',
      'function f() {\n  before(0);\n}\n',
      'function g() {\n  beforeEach(0);\n}\n',
      'function h() {\n  before(0);\n  after(1);\n}\n',
      'function i() {\n  beforeEach(0);\n  afterEach(1);\n}\n',
    ].join('\n'),
  ],
  'sorts require statements': [
    [
      "Local = require './local'",
      "{\n  Removed\n} = require '../removed'",
      "ThirdParty = require 'third-party'",
      "AlsoLocal = require './also-local'",
      "util = require 'util'",
      "FourthParty = require 'fourth-party'",
      "debug = require('debug')('xyz')",
      "AlsoRemoved = require '../also-removed'",
      '',
      'f = ->',
      '',
    ].join('\n'),
    [
      "const util = require('util');\n",
      "const debug = require('debug')('xyz');\n",
      "const FourthParty = require('fourth-party');\n",
      "const ThirdParty = require('third-party');\n",
      "const AlsoRemoved = require('../also-removed');\n",
      "const {\n  Removed\n} = require('../removed');\n",
      "const AlsoLocal = require('./also-local');\n",
      "const Local = require('./local');",
      '',
      'function f() {}',
      '',
    ].join('\n'),
  ],
  'does not sort if there are "official" side effects': [
    [
      "require './side-effects-only'",
      "ThirdParty = require 'third-party'",
      "util = require 'util'",
      '',
    ].join('\n'),
    [
      "require('./side-effects-only');",
      '',
      "const util = require('util');\n",
      "const ThirdParty = require('third-party');",
      '',
    ].join('\n'),
  ],
  'does not replace random if (x?) expressions': [
    'f() if (x?)\n',
    "if (typeof x !== 'undefined' && x !== null) {\n  f();\n}\n",
  ],
  'treats responders.foobar as a callback': [
    'f = ->\n  g responders.foobar\n',
    'function f() {\n  g(responders.foobar);\n}\n',
  ],
  'remove noErr if it has not been initialized at all': [
    'f = ->\n  someFn(noErr, 42)\n',
    'function f() {\n  return someFn(null, 42);\n}\n',
  ],
  'remove noErr if it was initialized with null': [
    'f = ->\n  someFn(noErr, 42)\n\nnoErr = null\n',
    'function f() {\n  return someFn(null, 42);\n}\n',
  ],
  'remove noErr if it was initialized with undefined': [
    'f = ->\n  someFn(noErr, 42)\n\nnoErr = null\n',
    'function f() {\n  return someFn(null, 42);\n}\n',
  ],
  'remove noErr unless it is initialized with something other than null': [
    'f = ->\n  someFn(noErr, 42)\n\nnoErr = true\n',
    'function f() {\n  return someFn(noErr, 42);\n}\n\nvar noErr = true;\n',
  ],
  'remove noErr unless it is defined inside of a function': [
    'f = ->\n  noErr = null\n  someFn(noErr, 42)\n',
    'function f() {\n  const noErr = null;\n  return someFn(noErr, 42);\n}\n',
  ],
  'renames identifiers to camelCase': [
    [
      'obj = { camel_case_method: -> }',
      'class X\n  camel_case_method: ->',
      'arr = []',
      'camel_case_fn = ->',
      'not_camel_case = 42',
      'SOME_CONSTANT = 88',
      'clashCamel = "foo"',
      'f { not_camel_case }',
      '{ extracted_camel } = obj',
      '{ more_camel: renamed_camel } = obj',
      '{ clash_camel} = obj',
      '[ array_a, array_b ] = arr',
      'g = (fn_arg, { camel_opt }) -> extracted_camel(renamed_camel, clash_camel, array_b, fn_arg, camel_opt)',
      '',
      '{ deeply_nested: { some_camel: hidden_id } } = obj',
      '',
    ].join('\n'),
    [
      'const obj = {\n  camel_case_method() {}\n};',
      'class X {\n  camel_case_method() {}\n}',
      'const arr = [];',
      '',
      'function camelCaseFn() {}',
      '',
      'const notCamelCase = 42;',
      'const SOME_CONSTANT = 88;',
      'const clashCamel = "foo";',
      'f({\n  not_camel_case: notCamelCase\n});',
      'const {\n  extracted_camel: extractedCamel\n} = obj;',
      'const {\n  more_camel: renamedCamel\n} = obj;',
      'const {\n  clash_camel: _clashCamel\n} = obj;',
      'const [arrayA, arrayB] = arr;',
      '',
      'function g(fnArg, {\n  camel_opt: camelOpt\n}) {\n  return extractedCamel(renamedCamel, _clashCamel, arrayB, fnArg, camelOpt);\n}',
      '',
      'const {\n  deeply_nested: {\n    some_camel: hiddenId\n  }\n} = obj;',
      '',
    ].join('\n'),
  ],
};

/** @param {string} str */
function normalizeNLs(str) {
  return str.replace(/\n{2,}/g, '\n');
}

['err', 'error', 'topErr', 'someError'].forEach(errName => {
  TEST_CASES[`function taking an node-style ${errName} callback`] = [
    `f = ->\n  g (${errName}) -> done()\n`,
    `function f() {\n  g(${errName} => {\n    done();\n  });\n}\n`,
  ];
});

[
  'done',
  'allDone',
  'cb',
  'callback',
  'finalCallback',
  'genericCb',
  'next',
].forEach(callbackName => {
  TEST_CASES[`return from function that takes ${callbackName}`] = [
    `f = (x, ${callbackName}) ->\n  y = 42\n  anything().foo(${callbackName})\n`,
    `function f(x, ${callbackName}) {\n  const y = 42;\n  anything().foo(${callbackName});\n}\n`,
  ];

  TEST_CASES[`return from function that takes ${callbackName} with nodeify`] = [
    `f = (x, ${callbackName}) ->\n  y = 42\n  anything().nodeify(${callbackName})\n`,
    `function f(x, ${callbackName}) {\n  const y = 42;\n  return anything().nodeify(${callbackName});\n}\n`,
  ];

  TEST_CASES[
    `return from function that takes ${callbackName} with asCallback`
  ] = [
    `f = (x, ${callbackName}) ->\n  y = 42\n  anything().asCallback(${callbackName})\n`,
    `function f(x, ${callbackName}) {\n  const y = 42;\n  return anything().asCallback(${callbackName});\n}\n`,
  ];

  TEST_CASES[
    `return from arrow function that takes ${callbackName} w/ block body`
  ] = [
    `wrap = ->\n  f = (${callbackName}) =>\n    x = 2\n    g(x)\n  null\n`,
    `function wrap() {\n  const f = ${callbackName} => {\n    const x = 2;\n    g(x);\n  };\n  return null;\n}\n`,
  ];

  [
    'if (err)',
    'if (err?)',
    'if (error)',
    'if (error?)',
    'if (topErr)',
    'if (someError)',
  ].forEach(errCheck => {
    const errName = errCheck.replace(/^.*\((\w+)(?:\W.*)?$/, '$1');
    TEST_CASES[`callback return ${callbackName} w/ ${errCheck}`] = [
      [
        'f = ->',
        `  return ${callbackName} ${errName} ${errCheck}`,
        '  x = 42',
        `  ${callbackName}(null, x)`,
      ].join('\n'),
      [
        'function f() {',
        `  if (${errName}) {`,
        `    ${callbackName}(${errName});`,
        '    return;',
        '  }',
        '  const x = 42;',
        `  ${callbackName}(null, x);`,
        '}',
        '',
      ].join('\n'),
    ];

    TEST_CASES[`short callback return ${callbackName} w/ ${errCheck}`] = [
      [
        `f -> ${callbackName}()`,
        `f -> ${callbackName}(${errName})`,
        `f -> ${callbackName}(null, data)`,
        `f (${callbackName}) -> a.b ${callbackName}`,
      ].join('\n'),
      [
        `f(() => {\n  ${callbackName}();\n});`,
        `f(() => {\n  ${callbackName}(${errName});\n});`,
        `f(() => {\n  ${callbackName}(null, data);\n});`,
        `f(${callbackName} => {\n  a.b(${callbackName});\n});`,
        '',
      ].join('\n'),
    ];
  });
});

describe('transforms/decaf', () => {
  [10].forEach(nodeVersion => {
    describe(`targeting node ${nodeVersion}`, async () => {
      const versionKey = `node${nodeVersion}`;
      Object.keys(TEST_CASES).forEach(desc => {
        const testCase = TEST_CASES[desc];

        it(desc, async function () {
          this.timeout(4000); // babel on node 4 can be rather slow at first...

          const converted = await decaf.transform(
            testCase[0],
            `${desc}.coffee`,
            `${desc}.js`,
            `${nodeVersion}.3.0`
          );
          const actual = normalizeNLs(converted)
            .replace(/^'use strict';\n+/, '')
            .replace(/^\/\*\n\s+\*\s+decaffeinate[\s\S]+?\*\/\n+/, '');

          const expected = normalizeNLs(testCase[1][versionKey] || testCase[1]);
          const matches = expected.test
            ? expected.test(actual)
            : actual === expected;
          if (!matches) {
            throw new AssertionError({
              message: `Conversion didn't produce the expected result`,
              actual,
              expected,
            });
          }
        });
      });
    });
  });
});

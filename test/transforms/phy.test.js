'use strict';

const assert = require('assert');
const normWS = require('./normalize-whitespace');
const transformPhy = require('../../lib/transforms/phy');

const TEST_CASES = {
  'empty attrs, no kids, has preact h': [
    'const { createElement: h } = require("preact"); function C() { return h("div", {}); }',
    'const { createElement: h } = require("preact"); function C() { return h("div"); }',
  ],

  'null attrs, one kid, has phy h': [
    'const { h } = require("phy"); function C() { return <div>foo</div>; }',
    'const { h } = require("phy"); function C() { return h("div", "foo"); }',
  ],

  'div, id  & class attrs, two kids': [
    'function C() { return h("div", { id: "i", class: "c" }, "foo", "bar"); }',
    'const h = require("phy"); function C() { return h("#i.c", ["foo", "bar"]); }',
  ],

  'span, className and other attr': [
    'function C() { return <span className="a b" data-x={[1]} />; }',
    'const h = require("phy"); function C() { return h("span.a.b", { "data-x": [1] }); }',
  ],

  'already phy': [
    'function C() { return h("#i", {}); }',
    'const h = require("phy"); function C() { return h("#i", {}); }',
  ],

  'fragment tag': [
    'function C() { return <><span /><span /></>; }',
    'const h = require("phy"); function C() { return h([h("span"), h("span")]); }',
  ],
};

describe('transforms/phy', () => {
  Object.keys(TEST_CASES).forEach(desc => {
    const codes = TEST_CASES[desc];
    it(desc, async () => {
      const result = await transformPhy.transform(
        codes[0],
        `${desc}.js`,
        `${desc}.js`,
        '10.0.0'
      );
      assert.strictEqual(normWS(result), normWS(codes[1]));
    });
  });
});

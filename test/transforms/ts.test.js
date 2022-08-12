'use strict';

const assert = require('assert');

const tsTransform = require('../../lib/transforms/ts');

/** @type {Record<string, [string, string]>} */
const TEST_CASES = {
  'removes use strict': ["'use strict';\n\nfoo();", 'foo();'],

  'interface declarations': [
    `/** 
      * @typedef Foo
      * @property {string=} optString1
      * @property {string} [optString2]
      * @property {Bar[]} nonOpt
      * 
      * @typedef Bar
      * @property {number} x
      */
     
      42;`,

    `\
export interface Foo {
  optString1?: string;
  optString2?: string;
  nonOpt: Bar[];
}
export interface Bar {
  x: number;
}
42;`,
  ],

  'non-imported aliases': [
    `/** @typedef {string[]} StringArray */
    42;`,
    'export type StringArray = string[];\n42;',
  ],

  'imported aliases': [
    `42;
     /**
      * @typedef {import('./blah').Bar} Bar
      * @typedef {import('./yadda')} Yadda
      */
     `,

    `import Yadda from "./yadda";\nimport { Bar } from "./blah";\n42;`,
  ],

  'required params': [
    `/**
      * @param {string} a
      * @param {Foo} b
      * @return {number}
      */
    function fn(a, b) {}`,

    `function fn(a: string, b: Foo): number {}`,
  ],

  'optional params': [
    `someCall(/**
      * @param {string=} a
      * @param {string} [b]
      */
     async (a, b = 'default') => {});`,

    "someCall(async (a?: string, b: string = 'default') => {});",
  ],

  'forced casts': [
    'const x = /** @type {string} */ (y);',
    'const x = (y as string);',
  ],

  'declared type': [
    `/** @type {string[]} */
     const x = [];`,

    'const x: string[] = [];',
  ],

  'default require': ["const foo = require('bar');", "import foo from 'bar';"],

  'esm default require': [
    `\
const foo = require('bar').default;
const { default: baz } = require('garply');`,
    `\
import foo from 'bar';
import baz from 'garply';`,
  ],

  'destructured require': [
    "const { a, b: c } = require('../');",
    "import { a, b as c } from '../';",
  ],

  'debug require': [
    "const debug = require('debug')('foo:bar');",
    `import Debug from "debug";\nconst debug = Debug('foo:bar');`,
  ],

  'single binding export': [
    'function foo() {}\nexports.foo = foo;',
    'export function foo() {}',
  ],

  'single literal export': ['exports.foo = 42;', 'export const foo = 42;'],

  'single default export': [
    'function a() {}\nmodule.exports = a;',
    'export default function a() {}',
  ],

  'bulk export': [
    'function a() {}\nmodule.exports = { a, b: 42 };',
    'export function a() {}\nexport const b = 42;',
  ],

  'backward-compatible export': [
    'module.exports = { "foo-bar": 1 };',
    'export = {\n  "foo-bar": 1\n};',
  ],
};

describe('transforms/ts', () => {
  for (const [desc, [js, ts]] of Object.entries(TEST_CASES)) {
    it(desc, async () => {
      assert.strictEqual(await tsTransform.transform(js), ts);
    });
  }
});

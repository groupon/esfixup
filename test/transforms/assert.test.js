'use strict';

const runAll = require('./run-all');
const transformAssert = require('../../lib/transforms/assert');

/** @type {import('./run-all').TestCases} */
const TEST_CASES = {
  all: {
    'refuse to replace with consumed return': [
      `const assert = require("assertive");
       assert.expect(foo);
       const x = assert.expect(foo);
       it(() => assert.expect(foo));
       function fn() { return [assert.expect(foo)]; }
       async () => { await assert.expect(foo); }`,

      `const assert = require("assert");
       const assertive = require("assertive");
       assert.strictEqual(foo, true);
       const x = assertive.expect(foo);
       it(() => assertive.expect(foo));
       function fn() { return [assertive.expect(foo)]; }
       async () => { await assertive.expect(foo); }`,
    ],

    expect: [
      `const { expect } = require("assertive");
       const { match } = require("assert");
       expect(foo);
       expect('some message', foo);`,

      `const { match, strictEqual } = require("assert");
       strictEqual(foo, true);
       strictEqual(foo, true, 'some message');`,
    ],

    truthy: [
      `const a = require("assertive");
       a.truthy(foo);
       a.truthy(msg, foo);`,

      `const assert = require("assert");
       assert.ok(foo);
       assert.ok(foo, msg);`,
    ],

    falsey: [
      `const a = require("assertive");
       a.falsey(foo);
       a.falsey(msg, foo);`,

      `const assert = require("assert");
       assert.ok(!foo);
       assert.ok(!foo, msg);`,
    ],

    equal: [
      `const a = require("assertive");
       a.equal(exp, act);
       a.equal(msg, exp, act);`,

      `const assert = require("assert");
       assert.strictEqual(act, exp);
       assert.strictEqual(act, exp, msg);`,
    ],

    notEqual: [
      `const a = require("assertive");
       a.notEqual(exp, act);
       a.notEqual(msg, exp, act);`,

      `const assert = require("assert");
       assert.notStrictEqual(act, exp);
       assert.notStrictEqual(act, exp, msg);`,
    ],

    deepEqual: [
      `const a = require("assertive");
       a.deepEqual(exp, act);
       a.deepEqual(msg, exp, act);`,

      `const assert = require("assert");
       assert.deepStrictEqual(act, exp);
       assert.deepStrictEqual(act, exp, msg);`,
    ],

    notDeepEqual: [
      `const a = require("assertive");
       a.notDeepEqual(exp, act);
       a.notDeepEqual(msg, exp, act);`,

      `const assert = require("assert");
       assert.notDeepStrictEqual(act, exp);
       assert.notDeepStrictEqual(act, exp, msg);`,
    ],

    match: [
      `const a = require("assertive");
       a.match(re, str);
       a.match(msg, re, str);`,

      `const assert = require("assert");
       assert.match(str, re);
       assert.match(str, re, msg);`,
    ],

    notMatch: [
      `const a = require("assertive");
       a.notMatch(re, str);
       a.notMatch(msg, re, str);`,

      `const assert = require("assert");
       assert.ok(!re.test(str));
       assert.ok(!re.test(str), msg);`,
    ],

    'include-to-match': [
      `const a = require("assertive");
       a.include("foo + bar", haystack);
       a.include(msg, "foo + bar", haystack);`,

      `const assert = require("assert");
       assert.match(haystack, /foo \\+ bar/);
       assert.match(haystack, /foo \\+ bar/, msg);`,
    ],

    include: [
      `const a = require("assertive");
       a.include(needle, haystack);
       a.include(msg, needle, haystack);`,

      `const assert = require("assert");
       assert.ok(haystack.includes(needle));
       assert.ok(haystack.includes(needle), msg);`,
    ],

    notInclude: [
      `const a = require("assertive");
       a.notInclude(needle, haystack);
       a.notInclude("foo + bar", haystack);
       a.notInclude(msg, needle, haystack);`,

      `const assert = require("assert");
       assert.ok(!haystack.includes(needle));
       assert.ok(!haystack.includes("foo + bar"));
       assert.ok(!haystack.includes(needle), msg);`,
    ],

    throws: [
      `const a = require("assertive");
       a.throws(() => { throw new Error("kaboom"); });
       a.throws(msg, () => {});`,

      `const assert = require("assert");
       assert.throws(() => { throw new Error("kaboom"); });
       assert.throws(() => {}, msg); `,
    ],

    notThrows: [
      `const a = require("assertive");
       a.notThrows(() => { throw new Error("kaboom"); });
       a.notThrows(msg, () => {});`,

      `const assert = require("assert");
       assert.doesNotThrow(() => { throw new Error("kaboom"); });
       assert.doesNotThrow(() => {}, msg); `,
    ],

    rejects: [
      `const a = require("assertive");
       random("nope", () => a.rejects(p));
       it("yep", () => a.rejects(p));
       async () => { await a.rejects(msg, p); }`,

      `const assert = require("assert");
       const assertive = require("assertive");
       random("nope", () => assertive.rejects(p));
       it("yep", () => assert.rejects(p));
       async () => { await assert.rejects(p, msg); }`,
    ],

    resolves: [
      `const a = require("assertive");
       random("nope", () => a.resolves(p));
       it("yep", () => a.resolves(p));
       async () => { await a.resolves(msg, p); }`,

      `const assert = require("assert");
       const assertive = require("assertive");
       random("nope", () => assertive.resolves(p));
       it("yep", () => assert.doesNotReject(p));
       async () => { await assert.doesNotReject(p, msg); }`,
    ],
  },
};

describe('transforms/assert', () => {
  runAll(transformAssert, TEST_CASES);
});

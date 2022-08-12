'use strict';

const assert = require('assert');

const transformJS = require('../../lib/transforms/js');
const runAll = require('./run-all');

const TEST_CASES = {
  all: {
    'object-spread: upgrade from Object.assign()': [
      'x.y({ baz }, bar); const x = Object.assign({ baz }, garply, { quux });',
      'x.y({ baz }, bar); const x = { baz, ...garply, quux };',
    ],

    'async-await: upgrade from bluebird.coroutine()': [
      `const bluebird = require('bluebird');
    const coroutine = require('bluebird').coroutine;
    const { coroutine: x } = require('bluebird');
    const fn = coroutine(function* genFn() {
      yield Promise.resolve(42);
      function* blah() {
        yield 42;
      }
      yield Promise.resolve(88);
    });
    const xFn = x(function* () { });
    it('does things', bluebird.coroutine(function* () {
      let fortyTwo = yield Promise.resolve(42);
      assert.equal(42, fortyTwo);
    }));`,

      `async function fn() {
      await Promise.resolve(42);
      function* blah() { yield 42; }
      await Promise.resolve(88);
    }
    async function xFn() {}
    it('does things', async () => {
      let fortyTwo = await Promise.resolve(42);
      assert.equal(42, fortyTwo);
    });`,
    ],

    'async-await: upgrade from co.wrap()': [
      `const co = require('co');
    const wrap = require('co').wrap;
    const { wrap: x } = require('co');
    const fn = wrap(function* genFn() {
      yield Promise.resolve(42);
      function* blah() {
        yield 42;
      }
    });
    const xFn = x(function* () { });
    it('does things', co.wrap(function* () {
      let fortyTwo = yield Promise.resolve(42);
      assert.equal(42, fortyTwo);
    }));
    it('does this things', x(function* () {
      yield this.foo();
    }));
    it('does argument things', x(function* () {
      assert(yield arguments[0]);
    }));`,

      `async function fn() {
      await Promise.resolve(42);
      function* blah() { yield 42; }
    }
    async function xFn() {}
    it('does things', async () => {
      let fortyTwo = await Promise.resolve(42);
      assert.equal(42, fortyTwo);
    });
    it('does this things', async function () {
      await this.foo();
    });
    it('does argument things', async function () {
      assert(await arguments[0]);
    });`,
    ],

    'async-await: move .prototype methods into class': [
      `class Foo {
      syncMethod() {}
    }
    Foo.prototype.asyncMethod = async function () {};`,

      `class Foo {
      syncMethod() {}
      async asyncMethod() {}
    }`,
    ],

    'destructuring: upgrade explicit arg assignments': [
      `const w = require('lib').w;
    const p = require('lib2').q;
    const r = require('lib3');
    const r1 = r.r1;
    const r2 = r.r2;
    function x(args) {
      const a = args.a;
      const b = args.b;
      const c = b.c;
      const d = b.D;
      z({ a, b });
    }
    function y(args) {
      const a = args.a;
      const b = args.b;
      const c = args[0];
      const d = args[1];
      z(a, b, args);
    }`,

      `const { w } = require('lib');
    const { q: p } = require('lib2');
    const { r1, r2 } = require('lib3');
    function x({ a, b }) { const { c, D: d } = b; z({ a, b }); }
    function y(args) {
      const { a, b } = args;
      const [c, d] = args;
      z(a, b, args);
    }`,
    ],

    'indexof-to-includes: ==': [
      `haystackE.indexOf(needleE) == -1;
     haystackF.indexOf(needleF) === 0;

     -1 === haystackP.indexOf(needleP);
     0 == haystackQ.indexOf(needleQ);`,

      `!haystackE.includes(needleE);
     haystackF.indexOf(needleF) === 0;
     !haystackP.includes(needleP);
     0 == haystackQ.indexOf(needleQ);`,
    ],

    'indexof-to-includes: !=': [
      `haystackW.indexOf(needleW) != -1;
     haystackX.indexOf(needleX) !== 0;

     -1 !== haystackY.indexOf(needleY);
     0 != haystackZ.indexOf(needleZ);`,

      `haystackW.includes(needleW);
     haystackX.indexOf(needleX) !== 0;
     haystackY.includes(needleY);
     0 != haystackZ.indexOf(needleZ);`,
    ],

    'indexof-to-includes: < / >': [
      `haystackA.indexOf(needleA) < 0;
     haystackB.indexOf(needleB) < -1;
     haystackI.indexOf(needleI) > -1;
     haystackJ.indexOf(needleJ) > 0;
     haystackK.indexOf(needleK) > 2;

     0 < haystackL.indexOf(needleL);
     -1 < haystackM.indexOf(needleM);
     -1 > haystackT.indexOf(needleT);
     0 > haystackU.indexOf(needleU);
     2 > haystackV.indexOf(needleV);`,

      `!haystackA.includes(needleA);
     haystackB.indexOf(needleB) < -1;
     haystackI.includes(needleI);
     haystackJ.indexOf(needleJ) > 0;
     haystackK.indexOf(needleK) > 2;
     0 < haystackL.indexOf(needleL);
     haystackM.includes(needleM);
     -1 > haystackT.indexOf(needleT);
     !haystackU.includes(needleU);
     2 > haystackV.indexOf(needleV);`,
    ],

    'indexof-to-includes: <= / >=': [
      `haystackC.indexOf(needleC) <= -1;
     haystackD.indexOf(needleD) <= 0;
     haystackG.indexOf(needleG) >= -1;
     haystackH.indexOf(needleH) >= 0;

     -1 <= haystackN.indexOf(needleN);
     0 <= haystackO.indexOf(needleO);
     -1 >= haystackR.indexOf(needleR);
     0 >= haystackS.indexOf(needleS);`,

      `!haystackC.includes(needleC);
     haystackD.indexOf(needleD) <= 0;
     haystackG.indexOf(needleG) >= -1;
     haystackH.includes(needleH);
     -1 <= haystackN.indexOf(needleN);
     haystackO.includes(needleO);
     !haystackR.includes(needleR);
     0 >= haystackS.indexOf(needleS);`,
    ],
  },

  10: {
    'global-url: removes unnecessary global URL requires': [
      `const { URL, URLSearchParams, parse } = require('url');`,

      `const { parse } = require('url');`,
    ],

    'global-url: mostly complete removal of unnecessary requires': [
      `const { URL } = require('url'), x = 42;`,

      `const x = 42;`,
    ],

    'global-url: complete removal of unnecessary requires': [
      `const { URL } = require('url');
     const { URLSearchParams } = require('bob');`,

      `const { URLSearchParams } = require('bob');`,
    ],

    'unused-err: removes unused try/catch err args with non-empty catch': [
      `try { something(); } catch (err) { throw blah; }`,

      `try { something(); } catch { throw blah; }`,
    ],

    'unused-err: removes unused try/catch err args with empty catch': [
      `try { something(); } catch (err) { /* ignored */ }`,

      `try { something(); } catch { /* ignored */ }`,
    ],

    'unused-err: leaves try/catch err arg which is used': [
      `try { something(); } catch (err) { console.log(err); }`,

      `try { something(); } catch (err) { console.log(err); }`,
    ],
  },

  12: {
    'array-flat: .concat.apply([], expr)': [
      `[].concat.apply([], stuff());
       Array.prototype.concat.apply([], stuff());
       [].concat.apply([1], stuff());
       [].concat.apply([], stuff(), otherStuff);
       [1].concat.apply([], stuff());`,

      `stuff().flat();
       stuff().flat();
       [].concat.apply([1], stuff());
       [].concat.apply([], stuff(), otherStuff);
       [1].concat.apply([], stuff());`,
    ],

    'array-flat: .concat(...expr):': [
      `[].concat(...stuff());
       [1].concat(...stuff());
       [].concat(x, ...stuff());`,

      `stuff().flat();
        [1].concat(...stuff());
        [].concat(x, ...stuff());`,
    ],
  },

  14: {
    'optional-chaining': [
      `const a1 = x && x[b];
       const a2 = x && x.b;
       const a3 = x && x.b && x.b.c;
       const a4 = x && x.b();
       const a5 = x && x();
       const a6 = x && x.y && x.y[0] && x.y[0].c;
       const b1 = x && y;
       const b2 = x && y.z;
       const b3 = x && y();`,

      `const a1 = x?.[b];
       const a2 = x?.b;
       const a3 = x?.b?.c;
       const a4 = x?.b();
       const a5 = x?.();
       const a6 = x?.y?.[0]?.c;
       const b1 = x && y;
       const b2 = x && y.z;
       const b3 = x && y();`,
    ],
  },
};

describe('transforms/js', () => {
  runAll(transformJS, TEST_CASES);

  // de-guard pre-processes __guard__() stuff into && stuff
  // then for Node >= 14, && stuff is turned into ?.
  // we want to test the de-guard stuff by itself, so we don't include it in
  // the runAll() above
  describe('de-guard', () => {
    const PRE_14 = '12.0.0';

    it('replaces matched __guard*__ calls and removes declarations', async () => {
      const res = await transformJS.transform(
        `__guard__(__guard__(a != null ? a.b : undefined, x => x.c), x => x.d);
        __guardMethod__(x, 'y', o => o.y());
         function __guard__() {}
         function __guardMethod__() {}`,
        'foo.js',
        'foo.js',
        PRE_14
      );

      assert.strictEqual(res, 'a && a.b && a.b.c && a.b.c.d;\n(x && x.y)();\n');
    });

    it('does not remove declarations if still in use', async () => {
      const res = await transformJS.transform(
        `__guard__();
        __guardMethod__();
         function __guard__() {}
         function __guardMethod__() {}`,
        'foo.js',
        'foo.js',
        PRE_14
      );

      assert.strictEqual(res, null);
    });
  });
});

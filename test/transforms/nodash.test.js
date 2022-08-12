'use strict';

const nodash = require('../../lib/transforms/nodash');
const runAll = require('./run-all');

const TEST_CASES = {
  all: {
    'assign: from lodash.assign': [
      `const a = require('lodash.assign');
       a({}, b, c);`,

      'Object.assign({}, b, c);',
    ],

    'assign: from lodash/assign, does not remove': [
      `const a = require('lodash/assign');
       a({}, b, c);
       const x = a;`,

      `const a = require('lodash/assign');
       Object.assign({}, b, c);
       const x = a;`,
    ],

    'assign: from lodash w/ destructure': [
      `const { assign } = require('lodash');
       assign({}, b, c);`,

      'Object.assign({}, b, c);',
    ],

    'assign: from lodash w/out destructure': [
      `const _ = require('lodash');
       _.assign({}, b, c);`,

      'Object.assign({}, b, c);',
    ],

    'assign: from lodash/assign and not': [
      `const a = require('lodash/assign');
       a({}, b, c);
       assign({}, b, c);`,

      `Object.assign({}, b, c);
       assign({}, b, c);`,
    ],

    /**
     * Lodash Array
     */
    compact: [
      `
      const arr = [0, 1, false, 2, '', 3];
      `,
      `const _ = require('lodash');

       _.compact(arr);
       `,
      `
arr.filter(Boolean);
      `,
      [
        [1, 2, 3], // lodash example
      ],
    ],

    compactNested: [
      `const _ = require('lodash');

const f = () => _.compact(arr);
       `,
      `
const f = () => arr.filter(Boolean);
      `,
    ],

    concat: [
      `
      const arr = [1];
      const arr2 = [3];
      const arr3 = [[4]];
      const value1 = 2;
      `,
      `
      const _ = require('lodash');

      _.concat([5]);
      _.concat(arr, value1);
      _.concat(arr, value1, arr2, arr3);
      `,
      `
      [5];
      arr.concat(value1);
      arr.concat(value1, arr2, arr3);
      `,
      [
        [5],
        [1, 2],
        [1, 2, 3, [4]], // lodash example
      ],
    ],

    difference: [
      `
      const arr = [2, 1];
      const arr2 = [2, 3];
      const arr3 = [2, 5];
      const combined = [arr2, arr3];
      `,
      `
      const _ = require('lodash');

      _.difference(arr, arr2);
      _.difference(arr, arr2, arr3);
      _.difference(arr, ...combined);
      _.difference(arr, arr);
      `,
      `
      arr.filter(x => !arr2.includes(x));
      (y => arr.filter(x => !y.includes(x)))([...arr2, ...arr3]);
      arr.filter(x => !combined.some(y => y.includes(x)));
      arr.filter(x => !arr.includes(x));
       `,

      [
        [1], // lodash example
        [1],
        [1],
        [],
      ],
    ],

    drop: [
      `
      const arr = [1, 2, 3];
      const by = 3;
      `,
      `
      const _ = require('lodash');

      _.drop([1, 2, 3]);
      _.drop(arr, 2);
      _.drop([1, 2, 3], 5);
      _.drop([1, 2, 3], 0);
      _.drop([1, 2, 3], -2);
      _.drop([1, 2, 3], by);
       `,

      `
      [1, 2, 3].slice(1);
      arr.slice(2);
      [1, 2, 3].slice(5);
      [1, 2, 3].slice(0);
      [1, 2, 3].slice(-2);
      [1, 2, 3].slice(by);
      `,
      [
        [2, 3], // lodash example
        [3], // lodash example
        [], // lodash example
        [1, 2, 3], // lodash example
        [2, 3],
        [],
      ],
    ],

    dropRight: [
      `
      const arr = [1, 2, 3];
      const by = 3;
      `,
      `
      const _ = require('lodash');

      _.dropRight([1, 2, 3]);
      _.dropRight(arr, 2);
      _.dropRight([1, 2, 3], 5);
      _.dropRight(arr, 0);
      _.dropRight([1, 2, 3], -2);
      _.dropRight([1, 2, 3], by);
       `,

      `
      [1, 2, 3].slice(0, -1);
      arr.slice(0, -2);
      [1, 2, 3].slice(0, -5);
      arr.slice(0, arr.length);
      [1, 2, 3].slice(0, [1, 2, 3].length);
      [1, 2, 3].slice(0, -by);
      `,
      [
        [1, 2], // lodash example
        [1], // lodash example
        [], // lodash example
        [1, 2, 3], // lodash example
        [1, 2, 3],
        [],
      ],
    ],

    fill: [
      `
      const arr = [1, 2, 3];
      `,
      `
      const _ = require('lodash');
      const { fill } = require('lodash');

       fill([1, 2, 3], 'x');
       _.fill(arr, 'a');
       _.fill(Array(3), 2);
       _.fill(['x', 2, 3], 2, 1);
       _.fill([4, 6, 8, 10], '*', 1, 3);
       `,

      `
       [1, 2, 3].fill('x');
       arr.fill('a');
       Array(3).fill(2);
       ['x', 2, 3].fill(2, 1);
       [4, 6, 8, 10].fill('*', 1, 3);
       `,
      [
        ['x', 'x', 'x'],
        ['a', 'a', 'a'], // lodash example
        [2, 2, 2], // lodash example
        ['x', 2, 2],
        [4, '*', '*', 10], // lodash example
      ],
    ],

    head: [
      `
      const arr = [1, 2, 3];
      `,
      `const _ = require('lodash');

       _.head(arr);
       _.head([]);
       _.first([5, 2]);
       `,

      `
      arr[0];
      [][0];
      [5, 2][0];
      `,
      [
        1, // lodash example
        undefined, // lodash example
        5,
      ],
    ],

    initial: [
      `
      const arr = [1, 2, 3];
      `,
      `const _ = require('lodash');
       _.initial([1]);
       _.initial(arr);
       `,

      `
      [1].slice(0, -1);
      arr.slice(0, -1);
      `,
      [
        [],
        [1, 2], // lodash example
      ],
    ],

    intersection: [
      `
      const arr = [2, 1];
      const intersect = [2, 3];
      `,
      `const _ = require('lodash');
       _.intersection([1, 2], [2, 3], [2, 4]);
       _.intersection([1, 2]);
       _.intersection(arr, intersect);
       `,

      `
      [1, 2].filter(x => [[2, 3], [2, 4]].every(y => y.includes(x)));
      [1, 2];
      arr.filter(x => [intersect].every(y => y.includes(x)));
      `,
      [
        [2],
        [1, 2],
        [2], // lodash example
      ],
    ],

    join: [
      `
      const arr = ['a', 'b', 'c'];
      const delimiter = '~';
      `,
      `const _ = require('lodash');
       _.join([1, 2], "|");
       _.join([1, 2]);
       _.join([1, 2], delimiter);
       _.join(arr, delimiter);
       `,

      `
      [1, 2].join("|");
      [1, 2].join(",");
      [1, 2].join(delimiter);
      arr.join(delimiter);
      `,
      [
        '1|2',
        '1,2',
        '1~2',
        'a~b~c', // lodash example
      ],
    ],

    last: [
      `
      const arr = [1, 2, 3];
      `,
      `const _ = require('lodash');
       _.last([1, 2]);
       _.last(arr);
       `,

      `
      [1, 2][[1, 2].length - 1];
      arr[arr.length - 1];
      `,
      [
        2,
        3, // lodash example
      ],
    ],

    take: [
      `
      const arr = [1, 2, 3];
      const by = 1;
      `,
      `const _ = require('lodash');

      _.take([1, 2, 3]);
      _.take(arr, 2);
      _.take([1, 2, 3], 5);
      _.take([1, 2, 3], 0);
      _.take([1, 2, 3], -2);
      _.take([1, 2, 3], by);
       `,

      `
      [...[1, 2, 3]].splice(0, 1);
      [...arr].splice(0, 2);
      [...[1, 2, 3]].splice(0, 5);
      [...[1, 2, 3]].splice(0, 0);
      [];
      [...[1, 2, 3]].splice(0, by);
      `,
      [
        [1], // lodash example
        [1, 2], // lodash example
        [1, 2, 3], // lodash example
        [], // lodash example
        [],
        [1],
      ],
    ],

    takeRight: [
      `
      const arr = [1, 2, 3];
      const by = 1;
      `,
      `const _ = require('lodash');

      _.takeRight([1, 2, 3]);
      _.takeRight([1, 2, 3], 2);
      _.takeRight([1, 2, 3], 5);
      _.takeRight([1, 2, 3], 0);
      _.takeRight(arr, 5);
      _.takeRight([1, 2, 3], -2);
      _.takeRight([1, 2, 3], by);
       `,

      `
      [...[1, 2, 3]].splice(-1, 1);
      [...[1, 2, 3]].splice(-2, 2);
      [...[1, 2, 3]].splice(-5, 5);
      [...[1, 2, 3]].splice(-0, 0);
      [...arr].splice(-5, 5);
      [];
      [...[1, 2, 3]].splice(-by, by);
      `,
      [
        [3], // lodash Example
        [2, 3], // lodash Example
        [1, 2, 3], // lodash Example
        [], // lodash Example
        [1, 2, 3],
        [],
        [3],
      ],
    ],

    without: [
      `
      const arr = [2, 1, 2, 3];
      const number = 3;
      `,
      `const _ = require('lodash');
       _.without(arr, 1, 2);
       _.without(arr, 1);
       _.without(arr, number);
       `,

      `
      arr.filter(x => ![1, 2].includes(x));
      arr.filter(x => ![1].includes(x));
      arr.filter(x => ![number].includes(x));
      `,
      [
        [3], // lodash example
        [2, 2, 3],
        [2, 1, 2],
      ],
    ],

    uniq: [
      'const x = [2, 1, 2];',
      `const _ = require('lodash');
       _.uniq(x);`,

      `
      [...new Set(x)];
      `,
      [
        [2, 1], // lodash example
      ],
    ],

    union: [
      `
      const x = [2];
      const withArray = [1, 2];
      const withArray1 = [5, 5, 8];

      `,
      `const _ = require('lodash');
       _.union(x, [2]);
       _.union(x, [1, 2], [1, 5]);
       _.union(x, withArray);
       _.union(x, withArray, withArray1);
       `,

      `
      [...new Set([...x, ...[2]])];
      [...new Set([...x, ...[1, 2], ...[1, 5]])];
      [...new Set([...x, ...withArray])];
      [...new Set([...x, ...withArray, ...withArray1])];
      `,
      [
        [2],
        [2, 1, 5],
        [2, 1], //lodash example
        [2, 1, 5, 8],
      ],
    ],

    unzip: [
      `
      const zipped = [['a', 1, true], ['b', 2, false]];
      const withArray = [5, 6];
      `,
      `
      const _ = require('lodash');
      _.unzip(zipped);
      _.unzip([[1, 2], withArray]);
      _.unzip([[1, 2], withArray, withArray]);
       `,

      `
      zipped[0].map((_v, _i) => [_v, ...zipped.slice(1).map(y => y[_i])]);
      [1, 2].map((_v2, _i2) => [_v2, ...[withArray].map(y => y[_i2])]);
      [1, 2].map((_v3, _i3) => [_v3, ...[withArray, withArray].map(y => y[_i3])]);
      `,
      [
        [
          // lodash example
          ['a', 'b'],
          [1, 2],
          [true, false],
        ],
        [
          [1, 5],
          [2, 6],
        ],
        [
          [1, 5, 5],
          [2, 6, 6],
        ],
      ],
    ],

    zip: [
      `
      const arr = ['a', 'b'];
      const withArray = [1, 2];
      `,
      `const _ = require('lodash');
       _.zip(arr, [1, 2], [true, false]);
       _.zip(arr, withArray);
       _.zip(arr, withArray, withArray);
       `,

      `
      arr.map((_v, _i) => [_v, ...[[1, 2], [true, false]].map(y => y[_i])]);
      arr.map((_v2, _i2) => [_v2, ...[withArray].map(y => y[_i2])]);
      arr.map((_v3, _i3) => [_v3, ...[withArray, withArray].map(y => y[_i3])]);
      `,
      [
        [
          // lodash example
          ['a', 1, true],
          ['b', 2, false],
        ],
        [
          ['a', 1],
          ['b', 2],
        ],
        [
          ['a', 1, 1],
          ['b', 2, 2],
        ],
      ],
    ],

    zipObject: [
      `
      const _ = require('lodash');
      const arr = ['a', 2, 3, 4];
      const args = [1, '2', 'a', 4];
      `,
      `
       _.zipObject(arr, args);
       _.zipObject(['a', 'b'], ['x']);
       `,

      `
      arr.reduce((_acc, _v, _i) => ({ ..._acc, [_v]: args[_i] }), {});
      ['a', 'b'].reduce((_acc2, _v2, _i2) => ({ ..._acc2, [_v2]: ['x'][_i2] }), {});
      `,
      [
        { 2: '2', 3: 'a', 4: 4, a: 1 }, // lodash example
        { a: 'x', b: undefined },
      ],
    ],

    /**
     * Lodash Object
     */

    keys: [
      `
      const obj = { a: 1 };
      function Foo() {
        this.a = 1;
        this.b = 2;
      }

      Foo.prototype.c = 3;
      `,
      `
      const _ = require('lodash');

      _.keys(obj);
      _.keys(new Foo());
      _.keys('hi');
      `,
      `
      Object.keys(obj);
      Object.keys(new Foo());
      Object.keys('hi');
      `,
      [
        ['a'],
        ['a', 'b'], // lodash example
        ['0', '1'], // lodash example
      ],
    ],

    values: [
      `
      const obj = { a: 1 };
      function Foo() {
        this.a = 1;
        this.b = 2;
      }

      Foo.prototype.c = 3;
      `,
      `
      const _ = require('lodash');
       _.values(obj);
       _.values(new Foo());
       _.values('hi');
       `,

      `
      Object.values(obj);
      Object.values(new Foo());
      Object.values('hi');
      `,
      [
        [1],
        [1, 2], // lodash example
        ['h', 'i'], // lodash example
      ],
    ],

    toPairs: [
      `
      const x = { z: 4, y: 2 };
      function Foo() {
        this.a = 1;
        this.b = 2;
      }

      Foo.prototype.c = 3;
      `,
      `const _ = require('lodash');

       _.toPairs(x);
       _.entries(new Foo());
       `,

      `
      Object.entries(x);
      Object.entries(new Foo());
      `,
      [
        [
          ['z', 4],
          ['y', 2],
        ],
        [
          ['a', 1],
          ['b', 2],
        ], // lodash example
      ],
    ],
  },
  12: {
    /**
     * Lodash Array
     */
    flatten: [
      `
      const arr = [1, [2, [3, [4]], 5]];
      `,
      `const _ = require('lodash');

       _.flatten(arr);
       _.flatten(arr, 3);
       `,

      `
      arr.flat(1);
      arr.flat(1);
      `,
      [
        [1, 2, [3, [4]], 5], // lodash example
        [1, 2, [3, [4]], 5],
      ],
    ],

    flattenDeep: [
      `
      const arr = [1, [2, [3, [4]], 5]];
      `,
      `const _ = require('lodash');
       _.flattenDeep(arr);
       _.flattenDeep(arr, 2);
       `,

      `
      arr.flat(Infinity);
      arr.flat(Infinity);
      `,
      [
        [1, 2, 3, 4, 5], // lodash example
        [1, 2, 3, 4, 5],
      ],
    ],

    flattenDepth: [
      `
      const arr = [1, [2, [3, [4]], 5]];
      const by = 2;
      `,
      `
      const _ = require('lodash');

       _.flattenDepth(arr, 1);
       _.flattenDepth(arr);
       _.flattenDepth(arr, Infinity);
       _.flattenDepth(arr, by);
       `,

      `
      arr.flat(1);
      arr.flat(1);
      arr.flat(Infinity);
      arr.flat(by);
      `,
      [
        [1, 2, [3, [4]], 5], // lodash example
        [1, 2, [3, [4]], 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, [4], 5], // lodash example
      ],
    ],

    fromPairs: [
      `
      const arr = [['a', 1], ['b', 2]];
      `,
      `const _ = require('lodash');
       _.fromPairs(arr);`,

      `
      Object.fromEntries(arr);
      `,
      [
        { a: 1, b: 2 }, // lodash example
      ],
    ],
  },
};

describe('transforms/nodash', () => {
  runAll(nodash, TEST_CASES);
});

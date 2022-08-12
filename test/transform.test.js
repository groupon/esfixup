'use strict';

const assert = require('assert');
const { writeFileSync, readFileSync, mkdirSync, symlinkSync } = require('fs');

const inTmpDir = require('./tmp-dir');
const { loadTransforms, runTransforms } = require('../');

describe('transform', () => {
  let transforms;
  before(() => {
    transforms = loadTransforms();
  });

  describe('loadTransforms()', () => {
    it('synchronously loads transforms', () => {
      assert(Array.isArray(transforms));
    });
  });

  // eslint-disable-next-line mocha/no-exclusive-tests
  describe('runTransforms()', () => {
    inTmpDir();
    it('can perform multiple transforms', async function () {
      this.timeout(60000); // due to eslint
      symlinkSync(`${__dirname}/../.eslintrc.json`, '.eslintrc.json');
      symlinkSync(`${__dirname}/../node_modules`, 'node_modules');
      mkdirSync('lib');
      writeFileSync('lib/a.coffee', 'fn = ({ a, b }) -> a + b\n');
      writeFileSync('lib/b.coffee', 'f = -> Object.assign({}, process.env);\n');
      await runTransforms(['lib'], {
        transforms,
        nodeVersion: '10.0.0',
      });

      assert.strictEqual(
        readFileSync('lib/a.ts', 'utf8'),
        'function fn({ a, b }) {\n  return a + b;\n}\n'
      );
      assert.strictEqual(
        readFileSync('lib/b.ts', 'utf8'),
        'function f() {\n  return { ...process.env };\n}\n'
      );
    });
  });
});

'use strict';

/* eslint-env mocha */

const assert = require('assert');

const semver = require('semver');

const NODE_MAJOR = semver.major(process.version);

/**
 * @typedef {[string, string] | [string, string, string, string]} TestCase
 * @typedef {{ [major: string]: { [desc: string]: TestCase } }} RunAllTests
 */

/** @param {string} line */
function normalizeCodeLine(line) {
  return line
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** @param {string} codeString */
function normalize(codeString) {
  return codeString.split(';').map(normalizeCodeLine).filter(Boolean);
}

function removeSetup(code, setup) {
  const normalizedCode = Array.isArray(code) ? code : normalize(code);
  return normalizedCode.reduce((acc, line) => {
    line = normalizeCodeLine(line);
    if (!setup.find(x => x.includes(line))) {
      acc.push(line);
    }
    return acc;
  }, []);
}

function runAll(transform, testCases) {
  for (const [major, cases] of Object.entries(testCases)) {
    Object.entries(cases).forEach(([desc, testCase]) => {
      let input;
      let output;
      let testSetup = '';
      let expectedOutput = '';
      if (testCase.length === 2) {
        [input, output] = testCase;
      }
      if (testCase.length === 4) {
        [testSetup, input, output, expectedOutput] = testCase;
      }
      if (major === 'all' || major <= NODE_MAJOR) {
        it(desc, async () => {
          const result = await transform.transform(
            testSetup + input,
            `${desc}.js`,
            `${desc}.js`,
            `${NODE_MAJOR}.0.0`
          );
          const normalizedSetup = normalize(testSetup);
          if (result) {
            const normResult = testSetup
              ? removeSetup(result, normalizedSetup)
              : normalize(result);
            const normOutput = normalize(output);
            assert.deepStrictEqual(normResult, normOutput);
          } else {
            assert.strictEqual(result, null);
          }

          if (expectedOutput) {
            const filteredResult = removeSetup(result, normalizedSetup);

            filteredResult.forEach((line, i) => {
              const msg = `solution ${i + 1}: ${line}`;
              const codeline = `${normalizedSetup.join(';')};${line}`.trim();
              assert.doesNotThrow(() => eval(codeline), msg);

              const expected =
                Array.isArray(expectedOutput) && expectedOutput.length
                  ? expectedOutput[i]
                  : expectedOutput;
              assert.deepStrictEqual(eval(codeline), expected, msg);
            });
          }
        });
      }

      if (major !== 'all') {
        it(`${desc} on <${major}`, async () => {
          const result = await transform.transform(
            input,
            `${desc}.js`,
            `${desc}.js`,
            `${major - 1}.0.0`
          );
          // result == null means no change means a-ok
          if (result) {
            assert.deepStrictEqual(normalize(result), normalize(input));
          }
        });
      }
    });
  }
}
module.exports = runAll;

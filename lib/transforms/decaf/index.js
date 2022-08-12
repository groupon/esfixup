/*
 * Copyright (c) 2022, Groupon, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const decaffeinate = require('decaffeinate');
const babelPresetEnv = require('@babel/preset-env');

const { BabelRunner } = require('../../babel-runner');
const useTopLevelFunctions = require('./transforms/use-top-level-functions');
const splitDeclarations = require('./transforms/split-declarations');
const naiveExtraction = require('./transforms/naive-extraction');
const mochaCalls = require('./transforms/mocha-calls');
const reorderRequire = require('./transforms/reorder-require');
const removeCallbackReturns = require('./transforms/remove-callback-returns');
const simpleDefault = require('./transforms/simple-default.js');
const removeNoErr = require('./transforms/remove-no-err');
const useCamelCase = require('./transforms/use-camel-case');
const splitAssignReturn = require('./transforms/split-assign-return');

/**
 * @param {string} source
 * @param {string} sourceFilename
 * @param {string} nodeVersion
 */
async function toBeautifulJavascript(source, sourceFilename, nodeVersion) {
  const passes = [
    {
      // Fix up some of the weird opinions decaffeinate has
      plugins: [
        reorderRequire,
        splitAssignReturn,
        naiveExtraction,
        useTopLevelFunctions,
        removeCallbackReturns,
        mochaCalls,
        useCamelCase,
        removeNoErr.removeNoErrDeclaration,
      ],
    },
    {
      presets: [[babelPresetEnv, { targets: { node: nodeVersion } }]],
    },
    {
      plugins: [
        splitDeclarations,
        simpleDefault,
        removeNoErr.removeUnboundNoErr,
      ],
    },
  ];

  const runner = new BabelRunner(source, sourceFilename);
  for (const pass of passes) await runner.run(pass);
  let { code } = runner;
  if (!/^(['"])use strict\1;\s*$/m.test(code)) {
    code = `'use strict';\n\n${code}`;
  }
  return code;
}

/** @param {string} source */
function prePatchCoffee(source) {
  return source.replace(
    // We optimize for this pattern later on
    /^[ \t]*module\.exports[ \t]*=[ \t]*(\w+)[ \t]*=/gm,
    '$1 = module.exports ='
  );
}

/**
 * @param {string} source
 * @param {string} sourceFilename
 */
function toRawJavascript(source, sourceFilename) {
  return decaffeinate.convert(source, {
    filename: sourceFilename,
    disableSuggestionComment: true,
    useJSModules: false,
    preferLet: false,
    noArrayIncludes: false,
    looseDefaultParams: true,
    looseForExpressions: true,
    looseForOf: true,
    looseIncludes: true,
  }).code;
}

/** @type {import('../../transform').Transform} */
module.exports = {
  name: 'decaf',
  descr: 'Convert coffee to idiomatic JS',
  order: 10,

  inExt: 'coffee',

  async transform(source, inFile, outFile, nodeVersion) {
    const patchedCoffee = prePatchCoffee(source);
    const rawJavaScript = toRawJavascript(patchedCoffee, inFile);
    const niceJS = await toBeautifulJavascript(
      rawJavaScript,
      outFile,
      nodeVersion
    );
    // Never more than one empty line - in general
    return niceJS.replace(/\n{3,}/g, '\n\n');
  },
};

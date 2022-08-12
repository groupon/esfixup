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

const { promisify } = require('util');
const fs = require('fs');

const readFile = promisify(fs.readFile);

const { BabelRunner } = require('../../babel-runner');
const {
  navigateAndStatusToLoadPage,
  convertToWDMethod,
} = require('./wd-methods');
const {
  injectBrowserToBeforeHook,
  removeSpuriousReturns,
  nukeThisDotBrowser,
  alreadyDone,
} = require('./program-prep');
const { fixupFunctions } = require('./cleanup');
const { findCallChains, buildAwaitCallChains } = require('./call-chains');

/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Function>} FunctionPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('../../transform').Transform} Transform
 */

/**
 * @param {boolean} defWD
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function plugin(defWD, { types: t }) {
  /** @type {FunctionPath[]} */
  const fnFixes = [];
  return {
    visitor: {
      // first we need to do various prep work across the whole program
      // before trying to fix individual functions & calls
      Program: {
        enter(path) {
          if (alreadyDone(t, path)) {
            path.stop();
            return;
          }

          // this also checks if this already looks like a wd file, and if it
          // is, aborts
          injectBrowserToBeforeHook(t, path, defWD);

          path.traverse({
            ReturnStatement: removeSpuriousReturns.bind(null, t),
            ThisExpression: nukeThisDotBrowser.bind(null, t),
          });
        },
        exit() {
          // here's where we deal with the coroutine() wrapping, fn-to-generator
          // fn conversions, arrow function building, etc.
          fixupFunctions(t, fnFixes);
        },
      },

      Function(path) {
        /** @type {string[]} */
        const elemVars = [];

        // do a first pass over each function to fix all of the methods in-place
        path.traverse({
          CallExpression(subPath) {
            if (!navigateAndStatusToLoadPage(t, subPath)) {
              convertToWDMethod(t, subPath, elemVars);
            }
          },

          // without this we see each CallExpression 2x or more for nested fns
          Function(subPath) {
            subPath.stop();
          },
        });

        // now that everything's normalized, we collect the list of all
        // contiguous sequences of testium calls
        /** @type {CallExpressionPath[][]} */
        const chains = [];
        path.traverse({
          CallExpression: findCallChains.bind(null, t, chains, elemVars),
          Function(subPath) {
            subPath.stop();
          },
        });

        // if we found some chains, we'll turn the calls into actual promise
        // chains and stick an await (or possibly return) before each one
        if (chains.length) {
          buildAwaitCallChains(t, chains);
          // ...and note that this function needs to be checked out on the way
          // out
          fnFixes.push(path);
        }
      },
    },
  };
}

/** @type {Transform} */
const transform = {
  name: 'testium-wd',
  descr: 'Converts testium-driver-sync tests to testium-driver-wd',
  order: 20,
  async transform(source, inFile) {
    const trc = await readFile('.testiumrc', 'utf8').catch(() => null);
    const defWD = /"driver"\s*:\s*"wd"|driver\s*=\s*wd\b/.test(trc || '');
    const runner = new BabelRunner(source, inFile);
    return runner.run({ plugins: [plugin.bind(null, defWD)] });
  },
};
module.exports = transform;

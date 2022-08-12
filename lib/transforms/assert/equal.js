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

// equal, deepEqual, notEqual, notDeepEqual, match (all same signature)

const { isAssertiveCall, fixAssertCall } = require('./utils');

/**
 * @typedef {import('.').AssertState} AssertState
 */

const NAME_MAP = {
  equal: 'strictEqual',
  notEqual: 'notStrictEqual',
  deepEqual: 'deepStrictEqual',
  notDeepEqual: 'notDeepStrictEqual',
  match: 'match',
};

/**
 * @param {import('@babel/types')} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} path
 * @param {{ opts: AssertState }} transformOpts
 */
function replaceEqual(t, path, { opts: state }) {
  for (const [assertiveName, assertName] of Object.entries(NAME_MAP)) {
    if (!isAssertiveCall(assertiveName, t, state, path)) continue;
    const args = fixAssertCall(assertName, 2, t, state, path);
    if (args) {
      // swap the expected and actual args order
      const exp = args.shift();
      if (exp) args.splice(1, 0, exp);
    }
  }
}

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
function equalPlugin({ types: t }) {
  return { visitor: { CallExpression: replaceEqual.bind(null, t) } };
}
module.exports = equalPlugin;

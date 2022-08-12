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

const { isAssertiveCall, fixAssertCall } = require('./utils');

// ...and notThrows

/*
  TODO: detect cases where the return value is captured & compared to something
  and use the built-in Error matching in assert()

  e.g.:
  const err = assertive.throws(fn);
  assertive.equal('ka + boom', err.message);
  assertive.match(/^ka/, err.message);
  assertive.include('+ boom', err.message);

  could be:
  assert.throws(fn, { message: 'ka + boom' });
  assert.throws(fn, { message: /^ka/ });
  assert.throws(fn, { message: /\+ boom/ });

  any other use of a saved err can be placed in a callback like:
  const err = assertive.throws(fn);
  customValidationOf(err);
  moreCustomValidation(err);

  could be:
  assert.throws(fn, err => {
    customValidationOf(err);
    moreCustomValidation(err);
  });
*/

/**
 * @param {import('@babel/types')} t
 * @param {import('@babel/traverse').NodePath<babel.types.CallExpression>} path
 * @param {{ opts: import('./').AssertState }} transformOpts
 */
function replaceThrows(t, path, { opts: state }) {
  /** @type {string} */
  let method = 'throws';
  if (isAssertiveCall('notThrows', t, state, path)) {
    method = 'doesNotThrow';
  } else if (!isAssertiveCall('throws', t, state, path)) {
    return;
  }

  fixAssertCall(method, 1, t, state, path);
}

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
function throwsPlugin({ types: t }) {
  return { visitor: { CallExpression: replaceThrows.bind(null, t) } };
}
module.exports = throwsPlugin;

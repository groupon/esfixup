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

// notMatch([msg, ]regexp, string)       => ok(!regexp.test(string)[, msg])

const { isAssertiveCall, fixAssertCall } = require('./utils');

/**
 * @typedef {import('./').AssertState} AssertState
 */

/**
 * @param {import('@babel/types')} t
 * @param {import('@babel/traverse').NodePath<babel.types.CallExpression>} path
 * @param {{ opts: AssertState }} transformOpts
 */
function replaceNotMatch(t, path, { opts: state }) {
  if (!isAssertiveCall('notMatch', t, state, path)) return;
  const args = fixAssertCall('ok', 2, t, state, path);
  if (!args) return;

  // args is currently (regexp, string[, msg])
  const regexp = args.shift();
  const string = args.shift();
  if (!regexp || !string) throw new Error("can't happen");

  // push back on !regexp.test(string)
  args.unshift(
    t.unaryExpression(
      '!',
      t.callExpression(t.memberExpression(regexp, t.identifier('test')), [
        string,
      ]),
      true
    )
  );
}

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
function notMatchPlugin({ types: t }) {
  return { visitor: { CallExpression: replaceNotMatch.bind(null, t) } };
}
module.exports = notMatchPlugin;

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

// ...and notInclude()

const { isAssertiveCall, fixAssertCall } = require('./utils');

/**
 * @typedef {import('.').AssertState} AssertState
 */

/**
 * stolen from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 * but also escape / because .regExpLiteral() will happily put a bare / in(!!)
 *
 * @param {string} string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * @param {import('@babel/types')} t
 * @param {import('@babel/traverse').NodePath<babel.types.CallExpression>} path
 * @param {{ opts: AssertState }} transformOpts
 */
function replaceInclude(t, path, { opts: state }) {
  let not = false;
  if (isAssertiveCall('notInclude', t, state, path)) {
    not = true;
  } else if (!isAssertiveCall('include', t, state, path)) return;

  // most uses of [not]include() can only be rewritten to .ok(), but
  // specifically include() with a literal string we can map to
  // .match(haystack, /escaped needle/)
  const needle = path.node.arguments[path.node.arguments.length > 2 ? 1 : 0];
  if (!not && t.isStringLiteral(needle)) {
    const args = fixAssertCall('match', 2, t, state, path);
    if (!args) return;
    args.shift(); // remove needle we already have
    args.splice(1, 0, t.regExpLiteral(escapeRegExp(needle.value)));
    return;
  }

  // for more general case convert .include(needle, haystack)
  // to .ok([!]haystack.includes(needle))
  const args = fixAssertCall('ok', 2, t, state, path);
  if (!args) return;

  if (!t.isExpression(needle)) return; // to make ts happy
  args.shift();
  const haystack = args.shift();
  if (!haystack) return;

  const includesCall = t.callExpression(
    t.memberExpression(haystack, t.identifier('includes')),
    [needle]
  );

  args.unshift(not ? t.unaryExpression('!', includesCall, true) : includesCall);
}

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
function includePlugin({ types: t }) {
  return { visitor: { CallExpression: replaceInclude.bind(null, t) } };
}
module.exports = includePlugin;

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

// _.difference(a, b)    -> a.filter(x => !b.includes(x))
// _.difference(a, b, c) -> (y => a.filter(x => !y.includes(x)))([...b, ...c])
// _.difference(a, ...b) -> a.filter(x => !b.some(y => y.includes(x)))
// maybe for node 12+ make: a.filter(x => !b.flat().includes(x))

const template = require('@babel/template').default;

const isLodashCall = require('./is-lodash-call');

const { generateUid } = require('./helper-babel');

/**
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 */

const simpleTwoCall = template(`A.filter(X => !B.includes(X))`);

/**
 *  _.difference(a, b)    -> a.filter(x => !b.includes(x))
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {Expression} obj
 * @param {Expression} exclude
 */
function simpleTwoArg(t, callPath, obj, exclude) {
  const x = generateUid(callPath);

  const replacement = simpleTwoCall({
    A: obj,
    B: exclude,
    X: t.identifier(x),
  });
  if (!Array.isArray(replacement)) callPath.replaceWith(replacement);
}

const threePlusCall = template(
  `(Y => A.filter(X => !Y.includes(X)))(EXCLUDES)`
);

/**
 * _.difference(a, b, c) -> (y => a.filter(x => !y.includes(x)))([...b, ...c])
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {Expression[]} args
 */
function threePlusArg(t, callPath, [obj, ...excludes]) {
  const x = generateUid(callPath);
  const y = generateUid(callPath, ['x']);

  const replacement = threePlusCall({
    X: t.identifier(x),
    Y: t.identifier(y),
    A: obj,
    EXCLUDES: t.arrayExpression(excludes.map(ex => t.spreadElement(ex))),
  });
  if (!Array.isArray(replacement)) callPath.replaceWith(replacement);
}

const secondSpreadCall = template(`A.filter(X => !B.some(Y => Y.includes(X)))`);

/**
 * _.difference(a, ...b) -> a.filter(x => !b.some(y => y.includes(x)))
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {Expression} obj
 * @param {Expression} arg
 */
function secondArgSpread(t, callPath, obj, arg) {
  const x = generateUid(callPath);
  const y = generateUid(callPath, ['x']);

  const replacement = secondSpreadCall({
    A: obj,
    X: t.identifier(x),
    B: arg,
    Y: t.identifier(y),
  });
  if (!Array.isArray(replacement)) callPath.replaceWith(replacement);
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function difference({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        if (!isLodashCall(t, 'difference', callPath)) return;
        const {
          node: { arguments: args },
        } = callPath;

        if (args.length < 2) return;
        if (!t.isExpression(args[0])) return;

        if (args.length === 2) {
          if (t.isSpreadElement(args[1])) {
            secondArgSpread(t, callPath, args[0], args[1].argument);
          } else if (t.isExpression(args[1])) {
            simpleTwoArg(t, callPath, args[0], args[1]);
          }
          return;
        }

        // 3+ args: they need to all be expressions
        if (args.slice(1).some(a => !t.isExpression(a))) return;
        threePlusArg(t, callPath, /** @type {Expression[]} */ (args));
      },
    },
  };
}
module.exports = difference;

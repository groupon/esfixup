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

/**
 * @tutorial https://youmightnotneed.com/lodash/#take
 * @tutorial https://youmightnotneed.com/lodash/#takeRight
 *
 * take([1, 2, 3]) -> [...[1, 2, 3]].splice(0, 1) -> [1]
 * take([1, 2, 3], 2) -> [...[1, 2, 3]].splice(0, 2) -> [1, 2]
 *
 * takeRight([1, 2, 3]) -> [...[1, 2, 3]].splice(-1, 1) -> [3]
 * takeRight([1, 2, 3], 2) -> [...[1, 2, 3]].splice(-2, 2) -> [2, 3]
 */

const isLodashCall = require('./is-lodash-call');

/**
 * @typedef {import('@babel/types')} T
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').ArrayExpression} ArrayExpression
 * @typedef {import('@babel/types').Statement} Statement
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 */

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function take_takeRight({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        if (!isLodashCall(t, ['take', 'takeRight'], callPath)) return;

        const args = callPath.node.arguments;
        if (args.length < 1 || args.length > 2) return;

        const [array, number = t.numericLiteral(1)] = args;

        if (!t.isExpression(array)) return;

        if (
          t.isNumericLiteral(number) || // case 1: number
          t.isIdentifier(number) // case 2: variable
        ) {
          const spliceArgs = isLodashCall(t, 'take', callPath)
            ? [t.numericLiteral(0), number]
            : [t.unaryExpression('-', number), number];
          callPath.replaceWith(
            t.callExpression(
              t.memberExpression(
                t.arrayExpression([t.spreadElement(array)]),
                t.identifier('splice')
              ),
              spliceArgs
            )
          );
        }

        // case 3: negative number
        if (
          t.isUnaryExpression(number) &&
          t.isNumericLiteral(number.argument)
        ) {
          callPath.replaceWith(t.arrayExpression([]));
        }
      },
    },
  };
}
module.exports = take_takeRight;

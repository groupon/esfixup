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
 * @tutorial https://youmightnotneed.com/lodash/#drop
 * @tutorial https://youmightnotneed.com/lodash/#dropRight

 * drop([1, 2, 3]) -> [1, 2, 3].slice(1) -> [2, 3]
 * drop([1, 2, 3], 2) -> [1, 2, 3].slice(2) -> [2]
 * drop([1, 2, 3], 5) -> [1, 2, 3].slice(5) -> []
 * drop([1, 2, 3], 0) -> [1, 2, 3].slice(0) -> [1, 2, 3]
 * drop([1, 2, 3], variable) -> [1, 2, 3].slice(variable)

 * dropRight([1, 2, 3]) -> [1, 2, 3].slice(0, -1) -> [1, 2]
 * dropRight([1, 2, 3], 2) -> [1, 2, 3].slice(0, -2) -> [1]
 * dropRight([1, 2, 3], 5) -> [1, 2, 3].slice(0, -5) -> []
 * dropRight([1, 2, 3], 0) -> [1, 2, 3].slice(0, [1, 2, 3].length) -> [1, 2, 3]
 * dropRight([1, 2, 3], variable) -> [1, 2, 3].slice(0, -variable)
 */
const isLodashCall = require('./is-lodash-call');

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function drop_dropRight({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        if (!isLodashCall(t, ['drop', 'dropRight'], callPath)) return;

        const args = callPath.node.arguments;
        if (args.length < 1 || args.length > 2) return;

        const [array, number] = args;
        if (!t.isExpression(array)) return;

        let dropBy;
        if (
          t.isUnaryExpression(number) || // case: number < 0
          t.isNumericLiteral(number) || // case: number >= 0
          t.isIdentifier(number) // case: number is variable
        ) {
          dropBy = number;
        } else {
          // case: no number set
          dropBy = t.numericLiteral(1);
        }

        if (!t.isExpression(array)) return;

        const dropByArgs = isLodashCall(t, 'dropRight', callPath)
          ? [
              t.numericLiteral(0),
              (t.isNumericLiteral(dropBy) && dropBy.value === 0) || // case 1: number = 0
              t.isUnaryExpression(dropBy) // case 2: negative number
                ? t.memberExpression(array, t.identifier('length'))
                : t.unaryExpression('-', dropBy),
            ]
          : [dropBy];

        callPath.replaceWith(
          t.callExpression(
            t.memberExpression(array, t.identifier('slice')),
            dropByArgs
          )
        );
      },
    },
  };
}
module.exports = drop_dropRight;

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
 *
 * @tutorial https://youmightnotneed.com/lodash/#without
 *
 * without(arr, [values]) -> arr.filter(x=> !values.includes(x))
 */

const template = require('@babel/template').default;
const isLodashCall = require('./is-lodash-call');

const { isBindingExpression, generateUid } = require('./helper-babel');

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function without({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        if (!isLodashCall(t, 'without', callPath)) return;

        const args = callPath.node.arguments;

        if (args.length === 0) return;

        const array = args.shift();

        if (
          t.isExpression(array) &&
          Array.isArray(args) &&
          args.every(x => {
            return (
              t.isNumericLiteral(x) ||
              isBindingExpression(t, callPath, x, t.isNumericLiteral)
            );
          })
        ) {
          const withoutTemplate = template(`X => !B.includes(x)`);
          const partial = withoutTemplate({
            X: t.identifier(generateUid(callPath)),
            // @ts-ignore
            B: t.arrayExpression(args),
          });

          if (t.isExpressionStatement(partial)) {
            callPath.replaceWith(
              t.callExpression(
                t.memberExpression(array, t.identifier('filter')),
                [partial.expression]
              )
            );
          }
        }
      },
    },
  };
}
module.exports = without;

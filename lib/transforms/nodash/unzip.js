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
 * @tutorial https://youmightnotneed.com/lodash/#unzip
 *
 * _.unzip(arr)                             -> arr[0].map((_v, _i) => [_v, ...arr.slice(1).map(y => y[_i])]);
 * _.unzip([[1, 2], [5, 6]])                -> [1, 2].map((_v2, _i2) => [_v2, ...[[5, 6]].map(y => y[_i2])]);
 * _.unzip([[1, 2], withArray])             -> [1, 2].map((_v3, _i3) => [_v3, ...[withArray].map(y => y[_i3])]);
 * _.unzip([[1, 2], withArray, withArray])  -> [1, 2].map((_v4, _i4) => [_v4, ...[withArray, withArray].map(y => y[_i4])]);
 */

const template = require('@babel/template').default;
const isLodashCall = require('./is-lodash-call');

const { generateUid } = require('./helper-babel');

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function unzip({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        if (!isLodashCall(t, 'unzip', callPath)) return;

        const args = callPath.node.arguments;

        if (args.length === 0) return;

        const [array] = args;

        if (
          t.isIdentifier(array) ||
          (t.isArrayExpression(array) && array.elements.length > 1)
        ) {
          const unzipTemplate = template(
            `A.map((V, I) => [V, ...B.map(B0 => B0[I])])`
          );
          const opts = t.isIdentifier(array)
            ? {
                A: t.memberExpression(array, t.numericLiteral(0), true),
                B: t.callExpression(
                  t.memberExpression(array, t.identifier('slice')),
                  [t.numericLiteral(1)]
                ),
              }
            : {
                A: array.elements.shift(),
                B: t.arrayExpression(array.elements),
              };

          const replacement = unzipTemplate({
            V: t.identifier(callPath.scope.generateUid('v')),

            B0: t.identifier(generateUid(callPath, ['x'])),
            I: t.identifier(callPath.scope.generateUid('i')),
            ...opts,
          });

          if (t.isExpressionStatement(replacement)) {
            callPath.replaceWith(replacement);
          }
        }
      },
    },
  };
}
module.exports = unzip;

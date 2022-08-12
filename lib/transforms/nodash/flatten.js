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
 * @tutorial https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
 *
 * _.flatten(arr) -> arr.flat(1)
 * _.flattenDeep(arr) -> arr.flat()
 * _.flattenDepth(arr) -> arr.flat(1)
 * _.flattenDepth(arr, depth) -> arr.flat(depth)
 * _.flattenDepth(arr, Infinity) -> arr.flat()
 */

const isLodashCall = require('./is-lodash-call');

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function flatten({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        const { node } = path;

        if (
          !isLodashCall(t, ['flatten', 'flattenDeep', 'flattenDepth'], path)
        ) {
          return;
        }
        if (node.arguments.length < 1) return;

        const [arr, depth] = node.arguments;
        if (!t.isExpression(arr)) return;

        // no arguments means infinity depth for array.flat
        const newArgs = [];

        // _.flat is recursively.
        if (isLodashCall(t, 'flattenDeep', path)) {
          newArgs.push(t.identifier('Infinity'));
        }

        // _.flatten a single level deep.
        if (isLodashCall(t, 'flatten', path)) {
          newArgs.push(t.identifier('1'));
        }

        if (isLodashCall(t, 'flattenDepth', path)) {
          if (
            t.isNumericLiteral(depth) || // case: depth = number
            t.isIdentifier(depth) // case: depth is Variable
          ) {
            newArgs.push(depth);
          } else if (depth === undefined) {
            // default depth
            newArgs.push(t.identifier('1'));
          }
        }

        node.callee = t.memberExpression(arr, t.identifier('flat'));
        node.arguments = newArgs;
      },
    },
  };
}
module.exports = flatten;

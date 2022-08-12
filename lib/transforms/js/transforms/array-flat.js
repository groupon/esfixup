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

// turn [].concat(...expr) into expr.flat()
// (and variants)

// [].concat(...expr)
// [].concat.apply([], expr)
// Array.prototype.concat.apply([], expr)

/**
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').SpreadElement} SpreadElement
 * @typedef {import('@babel/traverse').Visitor} Visitor
 */

/**
 * @param {import('@babel/types')} t
 * @param {Expression} object
 * @param {(Expression | SpreadElement)[]} args
 */
function arraySpreadVariant(t, object, args) {
  return (
    t.isArrayExpression(object) &&
    object.elements.length === 0 &&
    args.length === 1 &&
    t.isSpreadElement(args[0]) &&
    args[0].argument
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {Expression} object
 * @param {(Expression | SpreadElement)[]} args
 */
function fnApplyVariant(t, object, args) {
  return (
    // ...preceded by [].concat or Array.prototype.concat
    t.isMemberExpression(object) &&
    t.isIdentifier(object.property, { name: 'concat' }) &&
    // [].
    ((t.isArrayExpression(object.object) &&
      object.object.elements.length === 0) ||
      // Array.prototype.
      (t.isMemberExpression(object.object) &&
        t.isIdentifier(object.object.property, { name: 'prototype' }) &&
        t.isIdentifier(object.object.object, { name: 'Array' }))) &&
    // apply([], expr)
    args.length === 2 &&
    t.isArrayExpression(args[0]) &&
    !t.isSpreadElement(args[1]) &&
    args[0].elements.length === 0 &&
    // expr
    args[1]
  );
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function arrayFlat({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        const { callee, arguments: args } = callPath.node;

        // true for all variants
        if (!t.isMemberExpression(callee)) return;
        if (!args.every(arg => t.isExpression(arg) || t.isSpreadElement(arg)))
          return;
        const exprArgs = /** @type {(Expression | SpreadElement)[]} */ (args);

        /** @type {false | Expression} */
        let expr;
        // callee is .concat()
        if (t.isIdentifier(callee.property, { name: 'concat' })) {
          expr = arraySpreadVariant(t, callee.object, exprArgs);
        } else {
          // callee is .apply()
          if (!t.isIdentifier(callee.property, { name: 'apply' })) return;
          expr = fnApplyVariant(t, callee.object, exprArgs);
        }

        if (expr) {
          callPath.replaceWith(
            t.callExpression(t.memberExpression(expr, t.identifier('flat')), [])
          );
        }
      },
    },
  };
}
module.exports = arrayFlat;

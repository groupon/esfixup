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

// converts haystack.indexOf(needle) !== -1    to   haystack.includes(needle)
// (and variants)

/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').PrivateName} PrivateName
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/types').UnaryExpression} UnaryExpression
 */

/**
 * @param {import('@babel/types')} t
 * @param {Expression | PrivateName} left
 * @param {Expression | PrivateName} right
 * @param {string} operator
 */
function checkBinExp(t, left, right, operator) {
  // comparing to -1 or 0?
  let comparingTo;
  if (
    t.isUnaryExpression(right, { operator: '-' }) &&
    t.isNumericLiteral(right.argument, { value: 1 })
  ) {
    comparingTo = -1;
  } else if (t.isNumericLiteral(right, { value: 0 })) {
    comparingTo = 0;
  } else return false;

  // .indexOf(oneThing)?
  if (!t.isCallExpression(left)) return false;
  if (!t.isMemberExpression(left.callee)) return false;
  if (!t.isIdentifier(left.callee.property, { name: 'indexOf' })) {
    return false;
  }
  if (left.arguments.length !== 1) return false;

  const [needle] = left.arguments;
  const haystack = left.callee.object;

  let negate = false;
  switch (operator) {
    case '>':
      if (comparingTo !== -1) return false;
      break;

    case '<':
      if (comparingTo !== 0) return false;
      negate = true;
      break;

    case '>=':
      if (comparingTo !== 0) return false;
      break;

    case '<=':
      if (comparingTo !== -1) return false;
      negate = true;
      break;

    case '!=':
    case '!==':
      if (comparingTo !== -1) return false;
      break;

    case '===':
    case '==':
      if (comparingTo !== -1) return false;
      negate = true;
      break;

    default:
      return false;
  }

  return { needle, haystack, negate };
}

// called when we swap the left & right sides of a comparison to see if it
// makes sense the other direction  a < b  ->  b > a
/** @param {string} operator */
function invert(operator) {
  return operator.replace(/[<>]/, m => (m === '<' ? '>' : '<'));
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function indexOfToIncludes({ types: t }) {
  return {
    visitor: {
      BinaryExpression(eqPath) {
        const { left, right, operator } = eqPath.node;

        const res =
          checkBinExp(t, left, right, operator) ||
          checkBinExp(t, right, left, invert(operator));

        if (!res) return;

        const { needle, haystack, negate } = res;

        /** @type {CallExpression | UnaryExpression} */
        let includes = t.callExpression(
          t.memberExpression(haystack, t.identifier('includes')),
          [needle]
        );
        if (negate) includes = t.unaryExpression('!', includes);

        eqPath.replaceWith(includes);
      },
    },
  };
}
module.exports = indexOfToIncludes;

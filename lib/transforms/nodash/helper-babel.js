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
 * @typedef {import('@babel/types')} T
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').Statement} Statement
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 */

/**
 * The default generateUid() functions start with a leading underscore; let's
 * try some nice generic names first
 *
 * @param {import('@babel/traverse').NodePath} callPath
 * @param {string[]} [skip]
 */
function generateUid(callPath, skip = []) {
  for (const name of ['x', 'y', 'item']) {
    if (!skip.includes(name) && !callPath.scope.hasBinding(name)) return name;
  }
  return callPath.scope.generateUid('x');
}

exports.generateUid = generateUid;

/**
 * @param {import('@babel/types')} t
 * @param {any} obj
 * @return {boolean}
 */
function isNotExpression(t, obj) {
  return (
    t.isSpreadElement(obj) ||
    t.isJSXNamespacedName(obj) ||
    t.isJSXNamespacedName(obj)
  );
}
exports.isNotExpression = isNotExpression;

/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {any} obj
 * @return {Expression|undefined}
 */
function getOwnBindingExpression(t, callPath, obj) {
  let ownBindingInit;
  if (!isNotExpression(t, obj) && t.isExpression(obj)) {
    // @ts-ignore
    const ownBinding = callPath.scope.getOwnBinding(obj.name);
    if (ownBinding && !t.isArrayExpression(ownBinding)) {
      // @ts-ignore
      ownBindingInit = ownBinding.path.node.init;
    }
  }
  return ownBindingInit;
}
exports.getOwnBindingExpression = getOwnBindingExpression;

/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {any} number
 * @return {boolean}
 */
function isValidNumberArg(t, callPath, number) {
  if (number === undefined) {
    return true;
  }

  return (
    t.isIdentifier(number) ||
    t.isNumericLiteral(number) ||
    (t.isUnaryExpression(number) && t.isNumericLiteral(number.argument))
  );
}
exports.isValidNumberArg = isValidNumberArg;

/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {any} obj
 * @param {function} assertion
 * @return {boolean}
 */
function isBindingExpression(t, callPath, obj, assertion) {
  return assertion && assertion(getOwnBindingExpression(t, callPath, obj));
}
exports.isBindingExpression = isBindingExpression;

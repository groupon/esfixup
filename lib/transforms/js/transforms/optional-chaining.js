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

// turns a && a.b && a.b.c into a?.b?.c, etc.
// and a && a() into a.?()

/**
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').SpreadElement} SpreadElement
 * @typedef {import('@babel/types').JSXNamespacedName} JSXNamespacedName
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 * @typedef {import('@babel/types').OptionalMemberExpression} OptionalMemberExpression
 * @typedef {import('@babel/types').LogicalExpression} LogicalExpression
 * @typedef {import('@babel/traverse').NodePath<LogicalExpression>} LogicalExpressionPath
 */

/**
 * @param {BabelTypes} t
 * @param {MemberExpression | OptionalMemberExpression} memberExpr
 * @returns {MemberExpression}
 */
function deepCloneMemberExpression(t, { object, property, computed }) {
  return t.memberExpression(
    t.isMemberExpression(object) || t.isOptionalMemberExpression(object)
      ? deepCloneMemberExpression(t, object)
      : object,
    property,
    computed
  );
}

/**
 * @param {BabelTypes} t
 * @param {Expression} a
 * @param {Expression} b
 */
function isMemberExpressionsEquivalent(t, a, b) {
  let aCmp = a;
  let bCmp = b;
  if (
    (t.isMemberExpression(a) || t.isOptionalMemberExpression(a)) &&
    (t.isMemberExpression(b) || t.isOptionalMemberExpression(b))
  ) {
    aCmp = deepCloneMemberExpression(t, a);
    bCmp = deepCloneMemberExpression(t, b);
  }

  return t.isNodesEquivalent(aCmp, bCmp);
}

/**
 * replace: x && x.b
 * with: x?.b
 *
 * replace: x && x.b()
 * with: x?.b()
 *
 * replace: x && x()
 * with: x?.()
 *
 * @param {BabelTypes} t
 * @param {LogicalExpression} node
 * @param {number} [depth]
 * @returns {Expression | null}
 */
function andAndNewNode(t, { left, right }, depth = 0) {
  if (t.isLogicalExpression(left, { operator: '&&' })) {
    const newLeft = andAndNewNode(t, left, depth + 1);
    if (!newLeft) return null;
    left = newLeft;
  }

  // && x.y
  if (t.isMemberExpression(right)) {
    if (!isMemberExpressionsEquivalent(t, left, right.object)) return null;
    if (!t.isExpression(right.property)) return null;
    return t.optionalMemberExpression(
      left,
      right.property,
      right.computed,
      true
    );
    // && x.y(...args)
  } else if (t.isCallExpression(right)) {
    const { callee, arguments: maybeArgs } = right;
    if (t.isV8IntrinsicIdentifier(callee)) return null;
    for (const arg of maybeArgs) {
      if (t.isArgumentPlaceholder(arg)) return null;
    }
    const args =
      /** @type {(Expression | SpreadElement | JSXNamespacedName)[]} */ (
        maybeArgs
      );
    // x.y(
    if (t.isMemberExpression(callee)) {
      if (!isMemberExpressionsEquivalent(t, left, callee.object)) return null;
      if (!t.isExpression(callee.property)) return null;
      return t.optionalCallExpression(
        t.optionalMemberExpression(
          left,
          callee.property,
          callee.computed,
          true
        ),
        args,
        false
      );
      // x && x(
    } else if (t.isNodesEquivalent(left, callee)) {
      return t.optionalCallExpression(left, args, true);
    }
  }

  return null;
}

/**
 * @param {import('@babel/core')} babel
 * @returns {{ visitor: import('@babel/traverse').Visitor }}
 */
function useOptionalChaining({ types: t }) {
  return {
    visitor: {
      LogicalExpression(path) {
        const { node } = path;
        if (node.operator !== '&&') return;
        const newNode = andAndNewNode(t, node);
        if (newNode) {
          path.replaceWith(newNode);
          path.skip();
        }
      },
    },
  };
}
module.exports = useOptionalChaining;

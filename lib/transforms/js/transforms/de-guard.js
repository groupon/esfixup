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

// remove various constructs that decaffeinate adds to simulate the ?.
// behavior of coffeescript: simple things arrive looking like:
//
// x?.y → typeof x !== 'undefined' && x !== null ? x.y : undefined
//
// and more complex chains arrive like:
//
// a?.b?.c?.d →
// __guard__(__guard__(a != null ? a.b : undefined, x => x.c), x => x.d)
//
// this transform will cleanup both types and, if safe, remove the
// declarations of __guard__ and __guardMethod__

/**
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').LogicalExpression} LogicalExpression
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').FunctionDeclaration>} FunctionDeclarationPath
 * @typedef {import('@babel/traverse').NodePath<CallExpression>} CallExpressionPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ConditionalExpression>} ConditionalExpressionPath
 */

/**
 * iff they are no longer used, remove function __guard[Method]__(){...}
 *
 * @param {BabelTypes} t
 * @param {FunctionDeclarationPath} path
 */
function stripDeclarations(t, path) {
  const { id } = path.node;
  if (!t.isIdentifier(id)) return;
  if (id.name !== '__guard__' && id.name !== '__guardMethod__') return;
  const binding = path.scope.getBinding(id.name);
  if (binding && !binding.referenced) path.remove();
}

/**
 * check if we are handed an expr of the form:
 * a && a.b && a.b.c && a.b.c.d ...
 *
 * @param {BabelTypes} t
 * @param {Expression} expr
 * @param {number} [depth]
 */
function isAndAndChain(t, expr, depth = 0) {
  if (!t.isLogicalExpression(expr)) return false;
  if (!t.isMemberExpression(expr.right)) return false;
  if (
    t.isLogicalExpression(expr.left) &&
    isAndAndChain(t, expr.left, depth + 1)
  ) {
    return t.isNodesEquivalent(expr.left.right, expr.right.object);
  } else {
    return t.isNodesEquivalent(expr.left, expr.right.object);
  }
}

/**
 * @param {BabelTypes} t
 * @param {CallExpression} node
 */
function isGuardCall(t, { callee }) {
  return (
    t.isIdentifier(callee, { name: '__guard__' }) ||
    t.isIdentifier(callee, { name: '__guardMethod__' })
  );
}

/**
 * replace: __guard__(value, x => x.b)
 * with:    value && value.b
 * replace: __guardMethod__(value, 'b', o => o.b())
 * with:    value && value.b()
 *
 * @param {BabelTypes} t
 * @param {CallExpressionPath} path
 */
function transformGuardCalls(t, path) {
  const { callee, arguments: args } = path.node;
  let value, transform, method;

  if (t.isIdentifier(callee, { name: '__guard__' })) {
    if (args.length !== 2) return;
    [value, transform] = args;
  } else if (t.isIdentifier(callee, { name: '__guardMethod__' })) {
    if (args.length !== 3) return;
    [value, method, transform] = args;
  } else {
    return;
  }

  if (!t.isExpression(value)) return;

  // make sure transform function is like x =>
  if (!t.isFunction(transform) || transform.params.length !== 1) {
    return;
  }
  if (!t.isIdentifier(transform.params[0])) return;

  // ok, it's a __guard*__() call; we'll handle the recursion ourselves
  path.skip();

  // we have a nested __guard__ inside; handle that recursively
  if (t.isCallExpression(value) && isGuardCall(t, value)) {
    transformGuardCalls(
      t,
      /** @type {CallExpressionPath} */ (path.get('arguments.0'))
    );
  }

  // pre-apply the ?: conversion to normalize to x && x.b
  path.traverse({
    ConditionalExpression: questionColon.bind(null, t),
  });
  value = path.node.arguments[0];

  if (!t.isExpression(value)) return;

  // make sure function body is like => x.c or => x.c()
  let memberExpr;
  let callArgs;
  if (t.isCallExpression(transform.body)) {
    memberExpr = transform.body.callee;
    callArgs = transform.body.arguments;
  } else {
    memberExpr = transform.body;
  }

  if (!t.isMemberExpression(memberExpr)) return;

  const { object, property, computed } = memberExpr;
  if (!t.isIdentifier(object, { name: transform.params[0].name })) {
    return;
  }

  const newValue = isAndAndChain(t, value)
    ? /** @type {LogicalExpression} */ (value).right
    : value;

  // value && value.c (or .c())
  const newMemberExpr = t.memberExpression(newValue, property, computed);
  const andAndMemberExpr = t.logicalExpression(
    '&&',
    value,
    callArgs && !method
      ? t.callExpression(newMemberExpr, callArgs)
      : newMemberExpr
  );

  path.replaceWith(
    !!method && callArgs
      ? t.callExpression(andAndMemberExpr, callArgs)
      : andAndMemberExpr
  );
}

/**
 * @param {BabelTypes} t
 * @param {Expression} expr
 */
function equalsNully(t, expr) {
  if (!t.isBinaryExpression(expr)) return null;
  if (expr.operator !== '!==' && expr.operator !== '!=') return null;

  if (
    t.isUnaryExpression(expr.left, { operator: 'typeof' }) &&
    t.isStringLiteral(expr.right, { value: 'undefined' })
  ) {
    return expr.left.argument;
  } else if (t.isNullLiteral(expr.right) && t.isExpression(expr.left)) {
    return expr.left;
  }
  return null;
}

/**
 * replace:
 *   b != null ? b.c : undefined
 *   OR
 *   typeof b !== 'undefined' && b !== null ? b.c : undefined
 * with:
 *   b?.c
 * (and also handle b != null ? b.c() : undefined)
 *
 * @param {import('@babel/types')} t
 * @param {ConditionalExpressionPath} path
 */
function questionColon(t, path) {
  // (...test...) ? consequent : alternate
  const { test, consequent, alternate } = path.node;
  // make sure consequent looks like <something>.<something else>
  let object;
  if (t.isMemberExpression(consequent)) {
    ({ object } = consequent);
  } else if (
    t.isCallExpression(consequent) &&
    t.isMemberExpression(consequent.callee)
  ) {
    ({ object } = consequent.callee);
  } else {
    return;
  }
  if (!t.isIdentifier(alternate, { name: 'undefined' })) return;

  let expr;
  if (t.isLogicalExpression(test, { operator: '&&' })) {
    // make sure both sides are <expr> !== null or typeof <expr> !== 'undefined'
    expr = equalsNully(t, test.left);
    if (!expr) return;
    const expr2 = equalsNully(t, test.right);
    if (!expr2) return;

    // make sure both sides are the same, and the same as consequent
    if (!t.isNodesEquivalent(expr, expr2)) return;
  } else {
    expr = equalsNully(t, test);
    if (!expr) return;
  }

  if (!t.isNodesEquivalent(expr, object)) return;

  // rebuild as <something> && <something>.<something else>
  path.replaceWith(t.logicalExpression('&&', expr, consequent));
}

/**
 * @param {import('@babel/core')} babel
 * @returns {{ visitor: import('@babel/traverse').Visitor }}
 */
function deGuard({ types: t }) {
  return {
    visitor: {
      Program: {
        enter(progPath) {
          // Pass 1: transform uses of __guard__ and __guardMethod__
          //         and any inline ?: null guards
          progPath.traverse({
            ConditionalExpression: questionColon.bind(null, t),
            CallExpression: transformGuardCalls.bind(null, t),
          });
        },

        exit(progPath) {
          // update the bindings for pass 2 to work properly
          // @ts-ignore
          progPath.scope.crawl();

          // Pass 2: remove unused __guard__ and __guardMethod__ declarations
          progPath.traverse({
            FunctionDeclaration: stripDeclarations.bind(null, t),
          });
        },
      },
    },
  };
}
module.exports = deGuard;

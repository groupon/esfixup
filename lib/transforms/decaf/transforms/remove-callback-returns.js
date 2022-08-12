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

const CALLBACK_PATTERN = /(?:callback|done|cb|next)$/i;
const ERROR_PATTERN = /(?:error|err)$/i;

/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ReturnStatement>} ReturnStatementPath
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/traverse').Node} Node
 */

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function removeCallbackReturns({ types: t }) {
  /** @param {Node} node */
  function isNamedCallback(node) {
    return t.isIdentifier(node) && CALLBACK_PATTERN.test(node.name);
  }

  /** @param {Node} node */
  function isNamedError(node) {
    return t.isIdentifier(node) && ERROR_PATTERN.test(node.name);
  }

  /** @param {Node} node */
  function isErrorFirstFunction(node) {
    if (!t.isFunction(node) || node.params.length < 1) return false;
    return isNamedError(node.params[0]);
  }

  /** @param {Node} node */
  function isResponder(node) {
    return (
      t.isMemberExpression(node) &&
      t.isIdentifier(node.object, { name: 'responders' })
    );
  }

  /** @param {CallExpression} node */
  function isPromiseThenOrCatch(node) {
    const prop =
      node.callee && t.isMemberExpression(node.callee) && node.callee.property;
    return (
      prop &&
      t.isMemberExpression(node.callee) &&
      t.isIdentifier(prop) &&
      (prop.name === 'then' || prop.name === 'catch')
    );
  }

  /** @param {Node} node */
  function isCallback(node) {
    return (
      isNamedCallback(node) || isErrorFirstFunction(node) || isResponder(node)
    );
  }

  /** @param {Expression} node */
  function isCallbackCall(node) {
    return (
      t.isCallExpression(node) &&
      !isPromiseThenOrCatch(node) &&
      // done()
      (isCallback(node.callee) ||
        // f(x, done)
        isCallback(node.arguments[node.arguments.length - 1]))
    );
  }

  /** @param {ReturnStatementPath} path */
  function isLastStatement(path) {
    // 1. parent is a block statement
    // 2. the block statement's parent is some kind of function
    // 3. we are the last element in the block
    if (!t.isBlockStatement(path.parent)) return false;
    if (!t.isFunction(path.parentPath.parent)) return false;

    const parentMaxIndex = path.parent.body.length - 1;
    return path.key === parentMaxIndex;
  }

  // typeof $ !== 'undefined' && $ !== null
  /** @param {Expression} node */
  function getVerboseNullCheckTarget(node) {
    if (
      !t.isLogicalExpression(node, { operator: '&&' }) ||
      !t.isBinaryExpression(node.left, { operator: '!==' }) ||
      !t.isUnaryExpression(node.left.left, { operator: 'typeof' }) ||
      !t.isIdentifier(node.left.left.argument) ||
      !t.isStringLiteral(node.left.right, { value: 'undefined' }) ||
      !t.isBinaryExpression(node.right, { operator: '!==' }) ||
      !t.isIdentifier(node.right.left) ||
      !t.isNullLiteral(node.right.right)
    ) {
      return null;
    }
    const errorId = node.left.left.argument;
    if (errorId.name !== node.right.left.name) {
      return null;
    }
    return errorId;
  }

  // $ != null
  /** @param {Expression} node */
  function getConciseNullCheckTarget(node) {
    if (
      !t.isBinaryExpression(node, { operator: '!=' }) ||
      !t.isIdentifier(node.left) ||
      !t.isNullLiteral(node.right)
    ) {
      return null;
    }
    return node.left;
  }

  /** @param {Expression} node */
  function getSillyNullCheckTarget(node) {
    return getVerboseNullCheckTarget(node) || getConciseNullCheckTarget(node);
  }

  /** @param {Node | null} fn */
  function isCallbackedFunction(fn) {
    if (!fn || !t.isFunction(fn)) return false;
    const { params } = fn;

    const lastParam = params[params.length - 1];
    return lastParam && isCallback(lastParam);
  }

  /** @param {ReturnStatementPath} path */
  function isInCallbackFunction(path) {
    const fnPath = path.findParent(p => p.isFunction());
    return isCallbackedFunction(fnPath && fnPath.node);
  }

  /** @param {Expression} node */
  function isAsCallback(node) {
    return (
      t.isCallExpression(node) &&
      t.isMemberExpression(node.callee) &&
      (t.isIdentifier(node.callee.property, { name: 'nodeify' }) ||
        t.isIdentifier(node.callee.property, { name: 'asCallback' }))
    );
  }

  return {
    visitor: {
      ReturnStatement(path) {
        const value = path.node.argument;
        if (!value) return;

        if (
          !isAsCallback(value) &&
          (isCallbackCall(value) || isInCallbackFunction(path))
        ) {
          if (isLastStatement(path)) {
            path.replaceWith(t.expressionStatement(value));
          } else {
            path.replaceWithMultiple([
              t.expressionStatement(value),
              t.returnStatement(),
            ]);
          }
        }
      },

      ArrowFunctionExpression(path) {
        const value = path.node.body;
        if (
          !t.isBlockStatement(value) &&
          !isAsCallback(value) &&
          (isCallbackCall(value) || isCallbackedFunction(path.node))
        ) {
          path.node.body = t.blockStatement([t.expressionStatement(value)]);
        }
      },

      IfStatement(path) {
        // Replace if (typeof err !== 'undefined' && err !== null) with if (err)
        const nullCheckId = getSillyNullCheckTarget(path.node.test);
        if (nullCheckId && isNamedError(nullCheckId)) {
          path.node.test = nullCheckId;
        }
      },
    },
  };
}
module.exports = removeCallbackReturns;

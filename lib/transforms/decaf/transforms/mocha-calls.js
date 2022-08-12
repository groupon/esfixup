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

const MOCHA_HELPERS = new Set([
  'describe',
  'it',
  'context',
  'before',
  'beforeEach',
  'after',
  'afterEach',
]);

/**
 * @typedef {import('@babel/types').FunctionExpression} FunctionExpression
 * @typedef {import('@babel/types').ArrowFunctionExpression} ArrowFunctionExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('@babel/traverse').Node} Node
 * @typedef {import('@babel/traverse').Visitor} Visitor
 */

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function mochaCalls({ types: t }) {
  /**
   * @param {FunctionExpression | ArrowFunctionExpression} original
   * @param {(expr: BlockStatement | Expression) => BlockStatement} bodyPatch
   */
  function withPatchedBody(original, bodyPatch) {
    const newBody = bodyPatch(original.body);
    if (t.isArrowFunctionExpression(original)) {
      return t.arrowFunctionExpression(
        original.params,
        newBody,
        original.async
      );
    }
    return t.functionExpression(
      original.id,
      original.params,
      newBody,
      original.generator,
      original.async
    );
  }

  /**
   * @param {FunctionExpression | ArrowFunctionExpression} original
   */
  function withBlockBody(original) {
    return withPatchedBody(original, body =>
      t.blockStatement([
        t.expressionStatement(
          /** @type {FunctionExpression | ArrowFunctionExpression} */ (body)
        ),
      ])
    );
  }

  /**
   * @param {CallExpressionPath} path
   */
  function handleIt(path) {
    const handler = path.node.arguments[1];
    if (!t.isFunction(handler)) return;

    if (!t.isIdentifier(handler.params[0])) return;

    if (t.isBlockStatement(handler.body)) {
      // Ensure we don't end in a return for it('desc', (done) => {})
      const lines = handler.body.body;
      const lastIdx = lines.length - 1;
      const lastLine = lines[lastIdx];
      if (t.isReturnStatement(lastLine) && lastLine.argument) {
        lines[lastIdx] = t.expressionStatement(lastLine.argument);
      }
    } else {
      // this takes a done callback - ensure body is block
      path.replaceWith(
        t.callExpression(
          path.node.callee,
          [path.node.arguments[0]].concat(
            [withBlockBody(handler)],
            path.node.arguments.slice(2)
          )
        )
      );
    }
  }

  /**
   * @param {CallExpressionPath} path
   */
  function handleDescribe(path) {
    const handler = path.node.arguments[1];
    if (!t.isFunction(handler)) return;

    let newHandler;
    if (!t.isBlockStatement(handler.body)) {
      newHandler = withBlockBody(handler);
    } else {
      const lines = handler.body.body;
      const lastLine = lines[lines.length - 1];
      if (t.isReturnStatement(lastLine) && lastLine.argument) {
        newHandler = withPatchedBody(handler, () =>
          t.blockStatement(
            lines
              .slice(0, -1)
              .concat([
                t.expressionStatement(
                  /** @type {Exclude<typeof lastLine.argument, null>} */ (
                    lastLine.argument
                  )
                ),
              ])
          )
        );
      }
    }

    if (newHandler !== undefined) {
      path.replaceWith(
        t.callExpression(
          path.node.callee,
          [path.node.arguments[0]].concat(
            [newHandler],
            path.node.arguments.slice(2)
          )
        )
      );
    }
  }

  /**
   * @param {CallExpressionPath} path
   */
  function handleBeforeAfter(path) {
    const hookArgs = path.node.arguments;
    const handler = hookArgs.length > 1 ? hookArgs[1] : hookArgs[0];
    if (!handler || !t.isFunction(handler)) return;
    if (t.isAssignmentExpression(handler.body)) {
      handler.body = t.blockStatement([t.expressionStatement(handler.body)]);
    } else if (t.isBlockStatement(handler.body)) {
      const lines = handler.body.body;
      const lastLine = lines[lines.length - 1];
      if (
        t.isReturnStatement(lastLine) &&
        t.isAssignmentExpression(lastLine.argument)
      ) {
        lines[lines.length - 1] = t.expressionStatement(lastLine.argument);
      }
    }
  }

  /** @param {Node} node */
  function isMochaIdentifier(node) {
    if (!t.isIdentifier(node)) return false;
    return MOCHA_HELPERS.has(node.name);
  }

  /** @param {Node} node */
  function isSyncAssertCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isMemberExpression(node.callee) &&
      t.isIdentifier(node.callee.object, { name: 'assert' }) &&
      t.isIdentifier(node.callee.property) &&
      node.callee.property.name !== 'rejects'
    );
  }

  /** @param {Node} node */
  function isExpectChain(node) {
    let current = node;
    while (t.isMemberExpression(current)) {
      current = current.object;
    }
    return (
      t.isCallExpression(current) &&
      t.isIdentifier(current.callee, { name: 'expect' })
    );
  }

  /** @param {Node} node */
  function isMochaBlock(node) {
    return t.isCallExpression(node) && isMochaIdentifier(node.callee);
  }

  // Things that test suites use a lot and rarely ever make sense returning
  /** @param {Node} node */
  function isUselessReturnValue(node) {
    return isSyncAssertCall(node) || isExpectChain(node) || isMochaBlock(node);
  }

  return {
    visitor: {
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee, { name: 'it' })) {
          handleIt(path);
        } else if (t.isIdentifier(path.node.callee, { name: 'describe' })) {
          handleDescribe(path);
        } else if (
          t.isIdentifier(path.node.callee, { name: 'before' }) ||
          t.isIdentifier(path.node.callee, { name: 'beforeEach' }) ||
          t.isIdentifier(path.node.callee, { name: 'after' }) ||
          t.isIdentifier(path.node.callee, { name: 'afterEach' })
        ) {
          handleBeforeAfter(path);
        }
      },

      ArrowFunctionExpression(path) {
        if (
          isUselessReturnValue(path.node.body) &&
          !t.isBlockStatement(path.node.body)
        ) {
          path.node.body = t.blockStatement([
            t.expressionStatement(path.node.body),
          ]);
        }
      },

      ReturnStatement(path) {
        const value = path.node.argument;
        if (value && isUselessReturnValue(value)) {
          path.replaceWith(t.expressionStatement(value));
        }
      },
    },
  };
}
module.exports = mochaCalls;

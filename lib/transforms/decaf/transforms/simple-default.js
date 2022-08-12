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
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').FunctionDeclaration>} FunctionDeclarationPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ClassMethod>} ClassMethodPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ObjectMethod>} ObjectMethodPath
 * @typedef {import('@babel/types').Expression} Expression
 */

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function simpleDefault({ types: t }) {
  /** @param {Expression} node */
  function findArgumentsN(node) {
    if (
      !t.isMemberExpression(node, { computed: true }) ||
      !t.isIdentifier(node.object, { name: 'arguments' }) ||
      !t.isNumericLiteral(node.property)
    )
      return null;
    return node.property;
  }

  /** @param {Expression | null} [init] */
  function findOptionalArg(init) {
    // in:
    // arguments.length > n && arguments[n] !== undefined ? arguments[n] : expr
    // out:
    // { index: n, alternate: expr }
    if (
      !t.isConditionalExpression(init) ||
      // arguments.length > n && arguments[n] !== undefined
      !t.isLogicalExpression(init.test, { operator: '&&' }) ||
      // arguments.length > n
      !t.isBinaryExpression(init.test.left, { operator: '>' }) ||
      // arguments.length
      !t.isMemberExpression(init.test.left.left) ||
      !t.isIdentifier(init.test.left.left.object, { name: 'arguments' }) ||
      !t.isIdentifier(init.test.left.left.property, { name: 'length' }) ||
      // n (in > n)
      !t.isNumericLiteral(init.test.left.right) ||
      // arguments[n] !== undefined
      !t.isBinaryExpression(init.test.right, { operator: '!==' }) ||
      !t.isIdentifier(init.test.right.right, { name: 'undefined' })
    )
      return null;

    const fromComparison = t.isExpression(init.test.right.left)
      ? findArgumentsN(init.test.right.left)
      : null;
    const fromConsequent = findArgumentsN(init.consequent);

    if (
      fromComparison === null ||
      fromConsequent === null ||
      fromComparison.value !== fromConsequent.value
    )
      return null;

    return { index: fromComparison.value, alternate: init.alternate };
  }

  /**
   * @param {FunctionDeclarationPath | ObjectMethodPath | ClassMethodPath} path
   */
  function visitFunctionish(path) {
    const block = path.node.body;
    if (!t.isBlockStatement(block) || block.body.length < 1) return;

    const firstLine = block.body[0];
    if (
      !t.isVariableDeclaration(firstLine) ||
      firstLine.declarations.length !== 1
    )
      return;
    const decl = firstLine.declarations[0];
    if (!t.isIdentifier(decl.id)) return;
    const optionalArg = findOptionalArg(decl.init);
    if (optionalArg === null) return;
    const { params } = path.node;

    if (optionalArg.index !== params.length) return;
    params.push(decl.id);
    block.body[0] = t.expressionStatement(
      t.assignmentExpression(
        '=',
        decl.id,
        t.logicalExpression('||', decl.id, optionalArg.alternate)
      )
    );
  }

  return {
    visitor: {
      FunctionDeclaration(path) {
        visitFunctionish(path);
      },

      ClassMethod(path) {
        visitFunctionish(path);
      },

      ObjectMethod(path) {
        visitFunctionish(path);
      },
    },
  };
}
module.exports = simpleDefault;

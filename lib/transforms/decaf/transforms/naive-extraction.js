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
 * @typedef {import('@babel/types').LVal} LVal
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').VariableDeclaration>} VariableDeclarationPath
 * @typedef {import('@babel/types').ObjectPattern} ObjectPattern
 * @typedef {import('@babel/types').ObjectProperty} ObjectProperty
 * @typedef {import('@babel/types').Identifier} Identifier
 * @typedef {import('@babel/traverse').Node} Node
 */

/**
 * @param {import('@babel/types')} t
 * @param {Node} node
 */
function isArrayFrom(t, node) {
  return (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: 'Array' }) &&
    t.isIdentifier(node.property, { name: 'from' })
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {Expression} expr
 */
function stripArrayFrom(t, expr) {
  if (
    !t.isCallExpression(expr) ||
    !isArrayFrom(t, expr.callee) ||
    expr.arguments.length !== 1
  )
    return expr;
  const [arg] = expr.arguments;
  return t.isArgumentPlaceholder(arg) ||
    t.isJSXNamespacedName(arg) ||
    t.isSpreadElement(arg)
    ? expr
    : arg;
}

/**
 * @param {import('@babel/types')} t
 * @param {LVal} pattern
 */
function isSimpleArrayPattern(t, pattern) {
  return (
    t.isArrayPattern(pattern) &&
    pattern.elements.every(el => t.isIdentifier(el))
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {LVal} pattern
 */
function isSimpleObjectPattern(t, pattern) {
  return (
    t.isObjectPattern(pattern) &&
    pattern.properties.every(
      prop =>
        t.isObjectProperty(prop) &&
        t.isIdentifier(prop.key) &&
        t.isIdentifier(prop.value)
    )
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {Expression} init
 */
function getRequireTarget(t, init) {
  if (!t.isCallExpression(init)) return null;
  const { callee, arguments: args } = init;

  if (!t.isIdentifier(callee) || callee.name !== 'require') return null;
  if (args.length !== 1 || !t.isStringLiteral(args[0])) return null;
  return args[0].value;
}

// in:  const {a, b, c} = require('lodash');
// out: const a = require('lodash/a');
//      const b = require('lodash/b');
//      const c = require('lodash/c');
/**
 *
 * @param {import('@babel/types')} t
 * @param {VariableDeclarationPath} path
 * @param {ObjectPattern} pattern
 */
function handleLodashExtraction(t, path, { properties: props }) {
  path.replaceWithMultiple(
    props.flatMap(prop => {
      if (
        t.isObjectProperty(prop) &&
        t.isIdentifier(prop.key) &&
        t.isIdentifier(prop.value)
      ) {
        return t.variableDeclaration(path.node.kind, [
          t.variableDeclarator(
            prop.value,
            t.callExpression(t.identifier('require'), [
              t.stringLiteral(`lodash/${prop.key.name}`),
            ])
          ),
        ]);
      } else return [];
    })
  );
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function minimalExtraction({ types: t }) {
  return {
    visitor: {
      VariableDeclaration(path) {
        const decls = path.node.declarations;
        if (decls.length !== 1) return;
        const pattern = decls[0].id;
        const { init } = decls[0];

        if (!init) return;

        if (isSimpleArrayPattern(t, pattern)) {
          decls[0].init = stripArrayFrom(t, init);
        } else if (isSimpleObjectPattern(t, pattern)) {
          const moduleId = getRequireTarget(t, init);
          if (moduleId === 'lodash')
            handleLodashExtraction(
              t,
              path,
              /** @type {ObjectPattern} */ (pattern)
            );
        }
      },
    },
  };
}

module.exports = minimalExtraction;

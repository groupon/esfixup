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

const Path = require('path');

const camelCase = require('lodash.camelcase');

/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').AssignmentExpression>} AssignmentExpressionPath
 * @typedef {import('@babel/types').AssignmentExpression} AssignmentExpression
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').Identifier} Identifier
 * @typedef {import('@babel/types').FunctionExpression} FunctionExpression
 * @typedef {import('@babel/types').ArrowFunctionExpression} ArrowFunctionExpression
 * @typedef {FunctionExpression | ArrowFunctionExpression} FnExpr
 */

/**
 * @param {import('@babel/types')} t
 * @param {FnExpr} arrowFn
 */
function convertArrowBody(t, arrowFn) {
  if (!t.isBlockStatement(arrowFn.body)) {
    return t.blockStatement([t.returnStatement(arrowFn.body)]);
  }
  return arrowFn.body;
}

/**
 * @param {import('@babel/types')} t
 * @param {Expression} node
 */
function isAnonFunction(t, node) {
  return (
    t.isArrowFunctionExpression(node) ||
    (t.isFunctionExpression(node) && !node.id)
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {Expression} node
 */
function isAssignToModuleExports(t, node) {
  return (
    t.isAssignmentExpression(node) &&
    node.operator === '=' &&
    t.isMemberExpression(node.left) &&
    t.isIdentifier(node.left.object, { name: 'module' }) &&
    t.isIdentifier(node.left.property, { name: 'exports' })
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {Expression} node
 */
function isExportsObject(t, node) {
  return (
    t.isIdentifier(node, { name: 'exports' }) ||
    (t.isMemberExpression(node) &&
      t.isIdentifier(node.object, { name: 'module' }) &&
      t.isIdentifier(node.property, { name: 'exports' }))
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {AssignmentExpression} node
 */
function isExportsPropAssignment(t, node) {
  return (
    t.isAssignmentExpression(node) &&
    node.operator === '=' &&
    t.isMemberExpression(node.left) &&
    !node.left.computed &&
    t.isIdentifier(node.left.property) &&
    isExportsObject(t, node.left.object)
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {FnExpr} fn
 * @param {Identifier} fnId
 */
function buildNamedFunction(t, fn, fnId) {
  return t.functionDeclaration(
    fnId,
    fn.params,
    convertArrowBody(t, fn),
    false, // generator
    fn.async
  );
}

/**
 * @param {AssignmentExpressionPath} path
 * @param {string} niceId
 */
function ensureUniq(path, niceId) {
  return path.scope.hasBinding(niceId)
    ? path.scope.generateUidIdentifier(niceId).name
    : niceId;
}

/** @param {string} moduleId */
function getNiceFunctionName(moduleId) {
  const base = Path.basename(moduleId, Path.extname(moduleId));
  return camelCase(base);
}

/**
 * @param {import('@babel/types')} t
 * @param {FunctionExpression} fn
 */
function shouldBeFunctionStatement(t, fn) {
  if (t.isArrowFunctionExpression(fn)) {
    return false; // "if it doesn't use this"
  } else if (t.isFunctionExpression(fn)) {
    return true;
  }
  return false;
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function useTopLevelFunctions({ types: t }) {
  return {
    visitor: {
      AssignmentExpression(path, state) {
        if (
          t.isExpressionStatement(path.parent) &&
          isExportsPropAssignment(t, path.node) &&
          isAnonFunction(t, path.node.right)
        ) {
          const fn = /** @type {FnExpr} */ (path.node.right);
          const fnId = /** @type {MemberExpression} */ (path.node.left)
            .property;
          if (!t.isIdentifier(fnId)) return;

          path.parentPath.replaceWithMultiple([
            buildNamedFunction(t, fn, fnId),
            t.expressionStatement(
              t.assignmentExpression('=', path.node.left, fnId)
            ),
          ]);
        } else if (
          isAssignToModuleExports(t, path.node) &&
          isAnonFunction(t, path.node.right)
        ) {
          const fn = /** @type {FnExpr} */ (path.node.right);
          const uniqId = ensureUniq(
            path,
            getNiceFunctionName(
              /** @type {{ file: { opts: { filename: string } } }} */ (state)
                .file.opts.filename
            )
          );
          const fnId = t.identifier(uniqId);

          path.replaceWithMultiple([
            buildNamedFunction(t, fn, fnId),
            t.expressionStatement(
              t.assignmentExpression('=', path.node.left, fnId)
            ),
          ]);
        }
      },

      VariableDeclaration(path) {
        const { declarations } = path.node;

        if (declarations.length !== 1) return;

        const decl = declarations[0];
        if (!decl.init) return;

        // if it's a toplevel declaration
        if (t.isProgram(path.parent)) {
          if (isAnonFunction(t, decl.init) && t.isIdentifier(decl.id)) {
            // of nameless/arrow fn in var
            const { init: fn, id: fnId } = decl;

            path.replaceWith(
              buildNamedFunction(t, /** @type {FnExpr} */ (fn), fnId)
            );
            return;
          } else if (
            isAssignToModuleExports(t, decl.init) &&
            isAnonFunction(
              t,
              /** @type {AssignmentExpression} */ (decl.init).right
            ) &&
            t.isIdentifier(decl.id)
          ) {
            // it's a toplevel assignment like const x = module.exports = () =>
            const init = /** @type {AssignmentExpression} */ (decl.init);
            const fnId = decl.id;
            path.replaceWith(
              buildNamedFunction(t, /** @type {FnExpr} */ (init.right), fnId)
            );
            path.insertAfter(
              t.expressionStatement(
                t.assignmentExpression('=', init.left, fnId)
              )
            );
            return;
          }
        }

        if (
          t.isIdentifier(decl.id) &&
          t.isFunctionExpression(decl.init) &&
          shouldBeFunctionStatement(t, decl.init)
        ) {
          path.replaceWith(buildNamedFunction(t, decl.init, decl.id));
        }
      },
    },
  };
}
module.exports = useTopLevelFunctions;

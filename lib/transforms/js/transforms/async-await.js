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

// Where <pkg> is either bluebird or co and <fn> is either coroutine or wrap:
// 1) [<pkg>.]<fn>(function* () { ... yield ... })
//    => async function () { ... await ... }
// 2) const someName = <fn>(function* ignoredName() { ... })
//    => async function someName() { ... }

/**
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/types').ClassBody} ClassBody
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').Binding} Binding
 * @typedef {import('@babel/traverse').Node} Node
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Program>} ProgramPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').BlockStatement>} BlockStatementPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').AssignmentExpression>} AssignmentExpressionPath
 * @typedef {import('@babel/types').VariableDeclaration} VariableDeclaration
 */

/** @param {string} name */
function isFakeAwaitPackageName(name) {
  return name === 'bluebird' || name === 'co';
}

/**
 * @param {import('@babel/types')} t
 * @param {Node} node
 */
function isFakeAwaitPackageNameNode(t, node) {
  return t.isStringLiteral(node) && isFakeAwaitPackageName(node.value);
}

/** @param {string} name */
function isFakeAwaitFunctionName(name) {
  return name === 'coroutine' || name === 'wrap';
}

/**
 * @param {import('@babel/types')} t
 * @param {CallExpression} callExpr
 */
function isFakeAwaitRequire(t, callExpr) {
  return (
    t.isIdentifier(callExpr.callee, { name: 'require' }) &&
    callExpr.arguments.length === 1 &&
    isFakeAwaitPackageNameNode(t, callExpr.arguments[0])
  );
}

/**
 * @param {import('@babel/types')} t
 * @param {ProgramPath} path
 */
function findFakeAwaitPackagesOrFunctions(t, path) {
  /** @type {Binding[]} */
  const functions = [];
  /** @type {Set<Binding>} */
  const fromDestructure = new Set();

  for (const node of path.node.body) {
    if (!t.isVariableDeclaration(node)) continue;

    for (const dec of node.declarations) {
      // = xyz(...)
      if (t.isCallExpression(dec.init)) {
        if (!isFakeAwaitRequire(t, dec.init)) continue; // = require('<pkg>')

        // x = require('<pkg>')
        if (t.isIdentifier(dec.id)) {
          const binding = path.scope.getOwnBinding(dec.id.name);
          if (binding) functions.push(binding);
          continue;
          // ! { x } = ...
        } else if (!t.isObjectPattern(dec.id)) continue;

        for (const prop of dec.id.properties) {
          // { <fn>: x } = require('<pkg>')
          if (
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key) &&
            t.isIdentifier(prop.value) &&
            isFakeAwaitFunctionName(prop.key.name)
          ) {
            /** @type {Binding | undefined} */
            const binding = path.scope.getOwnBinding(prop.value.name);
            if (!binding) continue;
            fromDestructure.add(binding);
            functions.push(binding);
          }
        }
        continue;
        // = x.y
      } else if (!t.isMemberExpression(dec.init)) continue;

      // isMemberExpression() == true
      // = x(...).y
      if (!t.isCallExpression(dec.init.object)) continue;
      // = require('<pkg>').y
      if (!isFakeAwaitRequire(t, dec.init.object)) continue;
      if (!t.isIdentifier(dec.init.property)) continue;
      // = require('<pkg>').<fn>
      if (!isFakeAwaitFunctionName(dec.init.property.name)) continue;
      // x = require('<pkg>').<fn>
      if (t.isIdentifier(dec.id)) {
        const binding = path.scope.getOwnBinding(dec.id.name);
        if (binding) functions.push(binding);
      }
    }
  }

  return { functions, fromDestructure };
}

// turn class Foo { } Foo.prototype.fn = async function();
// into class Foo { async fn() { } }
// this function called for each potential assignment
/**
 * @param {import('@babel/types')} t
 * @param {Map<string, Node[]>} classes
 * @param {AssignmentExpressionPath} asstPath
 */
function moveAsyncsInClass(t, classes, asstPath) {
  const { left, right } = asstPath.node;

  // is the left side of the assignment Foo.prototype.something =
  if (!t.isMemberExpression(left)) return;
  if (!t.isMemberExpression(left.object)) return;
  if (!t.isIdentifier(left.object.object)) return;
  const classBody = classes.get(left.object.object.name);
  if (!classBody) return;
  if (!t.isIdentifier(left.object.property, { name: 'prototype' })) {
    return;
  }
  const id = left.property;
  if (!t.isIdentifier(id)) return;

  // is the right side of the assignment = async function () { }
  if (!t.isFunctionExpression(right, { async: true, generator: false })) return;

  // add the new class method to the class
  classBody.push(
    Object.assign(t.classMethod('method', id, right.params, right.body), {
      async: true,
    })
  );

  // delete the assignment
  asstPath.remove();
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function fakeAwaitToAsyncAwait({ types: t }) {
  /** @type {Map<string, Node[]>} */
  const classes = new Map();

  /** @type {Binding[]} */
  let functions;
  /** @type {Set<Binding>} */
  let fromDestructure;

  return {
    visitor: {
      Program: {
        enter(progPath) {
          // look for <pkg> declarations at the toplevel
          ({ functions, fromDestructure } = findFakeAwaitPackagesOrFunctions(
            t,
            progPath
          ));
        },

        exit(progPath) {
          // remove saved <pkg> declarations at toplevel
          for (const binding of functions) {
            // for some reason destructure bindings count as an extra reference
            if (binding.references > (fromDestructure.has(binding) ? 1 : 0)) {
              continue;
            }
            const decl = binding.path;
            if (
              /** @type {VariableDeclaration} */ (decl.parent).declarations
                .length === 1
            ) {
              decl.parentPath?.remove();
            } else decl.remove();
          }

          // after we're done, check all the assignments
          progPath.traverse({
            AssignmentExpression: moveAsyncsInClass.bind(null, t, classes),
          });
        },
      },

      CallExpression(path) {
        // given <fn> like `coroutine` or <pkg>.<fn> like `co.wrap`...
        // <fn>(...)
        // <pkg>.<fn>(...)
        let fakeAwaitFunctionBinding;
        if (t.isIdentifier(path.node.callee)) {
          fakeAwaitFunctionBinding = path.scope.getBinding(
            path.node.callee.name
          );
        } else if (
          t.isMemberExpression(path.node.callee) &&
          t.isIdentifier(path.node.callee.object) &&
          t.isIdentifier(path.node.callee.property) &&
          isFakeAwaitFunctionName(path.node.callee.property.name)
        ) {
          fakeAwaitFunctionBinding = path.scope.getBinding(
            path.node.callee.object.name
          );
        }
        if (
          !fakeAwaitFunctionBinding ||
          !functions.includes(fakeAwaitFunctionBinding)
        )
          return;
        if (path.node.arguments.length !== 1) return;

        const genFn = path.node.arguments[0];
        // <fn>(function* () { ... })
        if (!t.isFunctionExpression(genFn, { generator: true })) return;

        // replace `yield` with `await` (but only in this function's level)
        const fnPath = /** @type {BlockStatementPath} */ (
          path.get('arguments.0.body')
        );
        {
          let subFnDepth = 0;
          fnPath.traverse({
            YieldExpression(subPath) {
              if (subFnDepth === 0 && subPath.node.argument) {
                subPath.replaceWith(t.awaitExpression(subPath.node.argument));
              }
            },
            Function: {
              enter() {
                subFnDepth++;
              },
              exit() {
                subFnDepth--;
              },
            },
          });
        }

        // const fn = <fn>(function* () { ... });
        // =>
        // async function fn() { ... }
        if (
          t.isVariableDeclarator(path.parent) &&
          t.isIdentifier(path.parent.id) &&
          /** @type {VariableDeclaration} */ (path.parentPath.parent)
            .declarations.length === 1
        ) {
          path.parentPath.parentPath?.replaceWith(
            t.functionDeclaration(
              path.parent.id,
              genFn.params,
              genFn.body,
              false,
              true
            )
          );
        } else {
          let hasThisOrArguments = false;
          let subFnDepth = 0;
          fnPath.traverse({
            ThisExpression() {
              if (subFnDepth === 0) hasThisOrArguments = true;
            },
            Identifier({ node: { name } }) {
              if (subFnDepth === 0 && name === 'arguments') {
                hasThisOrArguments = true;
              }
            },
            Function: {
              enter() {
                subFnDepth++;
              },
              exit() {
                subFnDepth--;
              },
            },
          });

          if (hasThisOrArguments) {
            genFn.async = true;
            genFn.generator = false;
            path.replaceWith(genFn);
          } else {
            path.replaceWith(
              t.arrowFunctionExpression(genFn.params, genFn.body, true)
            );
          }
        }

        // @ts-ignore -- not in the types, for some reason
        fakeAwaitFunctionBinding.dereference();
      },

      ClassDeclaration(path) {
        if (path.node.id) classes.set(path.node.id.name, path.node.body.body);
      },
    },
  };
}

module.exports = fakeAwaitToAsyncAwait;

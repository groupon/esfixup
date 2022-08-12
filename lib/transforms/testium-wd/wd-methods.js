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

const {
  testiumMethods,
  isSyncBrowserMethod,
  ensurePropertyValue,
  isMochaCall,
} = require('./common');

/**
 * @typedef {import('./common').TestiumMethod} TestiumMethod
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('@babel/traverse').Node} Node
 * @typedef {import('@babel/types').ExpressionStatement} ExpressionStatement
 * @typedef {import('@babel/traverse').NodePath<Node>} NodePath
 * @typedef {import('@babel/traverse').NodePath<ExpressionStatement>} ExpressionStatementPath
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').NumericLiteral} NumericLiteral
 * @typedef {import('@babel/types').Statement} Statement
 */

/**
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 */
function getFollowingExprs(t, path) {
  /** @type {ExpressionStatementPath[]} */
  const exprs = [];

  if (path.parentPath.inList) {
    for (const p of path.parentPath.getAllNextSiblings()) {
      if (p.isExpressionStatement()) exprs.push(p);
    }
  }

  const mochaCall = path.findParent(isMochaCall.bind(null, t));
  if (!mochaCall || !mochaCall.parentPath?.inList) return exprs;

  mochaCall.parentPath.getAllNextSiblings().forEach(otherTest => {
    const otherExp = otherTest.get('expression');
    if (
      Array.isArray(otherExp) ||
      !otherExp.isCallExpression() ||
      !isMochaCall(t, otherExp)
    )
      return;

    let otherFn = otherExp;

    // in case we've got a coroutine() wrapper
    if (t.isCallExpression(otherFn.node.arguments[1])) {
      otherFn = /** @type {CallExpressionPath} */ (otherFn.get('arguments.1'));
    }

    for (let i = 0; i < otherFn.node.arguments.length; i++) {
      const fn = otherFn.node.arguments[i];
      if (!t.isFunction(fn)) continue;
      if (!t.isBlockStatement(fn.body)) continue;
      fn.body.body.forEach((expr, j) => {
        const stmt = otherFn.get(`arguments.${i}.body.body.${j}`);
        if (!Array.isArray(stmt) && stmt.isExpressionStatement()) {
          exprs.push(stmt);
        }
      });
      break;
    }
  });

  return exprs;
}

/**
 * equal('foo', 204, browser.getStatusCode())
 * assert.equal(browser.getStatusCode(), 500)
 *
 * @param {import('@babel/types')} t
 * @param {Expression} expr
 */
function assertedStatusCode(t, expr) {
  if (!t.isCallExpression(expr)) return null;
  if (
    !t.isIdentifier(expr.callee, { name: 'equal' }) &&
    (!t.isMemberExpression(expr.callee) ||
      !t.isIdentifier(expr.callee.object, { name: 'assert' }) ||
      !t.isIdentifier(expr.callee.property, { name: 'equal' }))
  )
    return null;

  const args = [...expr.arguments];
  if (args.length === 3) args.shift(); // shift off doc string
  let [num, call] = args;

  // in case they got the assertive order wrong, sigh
  if (!t.isNumericLiteral(num)) {
    if (!t.isNumericLiteral(call)) return null;
    num = args[1];
    call = args[0];
  }
  if (!t.isCallExpression(call)) return null;

  if (!isSyncBrowserMethod(t, call, { name: 'getStatusCode' })) return null;

  return /** @type {NumericLiteral} */ (num).value;
}

/**
 * special-case handler before general method tranformers:
 * finds uses of browser.navigateTo(), then looks for an optional later sibling
 * that does browser.assert.httpStatus(n) and combines the two into a
 * `loadPage()` call
 * TODO: also find calls to `assert.equal([msg, ]n, browser.getStatusCode())`,
 * which people do a lot
 * TODO: also find either type of assertion in later it() calls, and just
 * nuke the it() call
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 */
function navigateAndStatusToLoadPage(t, path) {
  if (!isSyncBrowserMethod(t, path.node, { name: 'navigateTo' })) return false;
  const callee = /** @type {MemberExpression} */ (path.node.callee);
  if (!t.isIdentifier(callee.property)) return false;
  callee.property.name = 'loadPage';

  for (const fPath of getFollowingExprs(t, path)) {
    const fExpr = fPath.node.expression;
    if (!fExpr) continue;
    if (t.isCallExpression(fExpr) && isSyncBrowserMethod(t, fExpr)) {
      const fCallee = /** @type {MemberExpression} */ (fExpr.callee);
      if (!t.isIdentifier(fCallee.property)) continue;
      const method = fCallee.property.name;
      if (method === 'navigateTo' || method === 'loadPage') return true;
    }
    let code;
    if (
      t.isCallExpression(fExpr) &&
      isSyncBrowserMethod(t, fExpr, { assert: true, name: 'httpStatus' }) &&
      t.isNumericLiteral(fExpr.arguments[0])
    ) {
      code = Number(fExpr.arguments[0].value);
    } else {
      code = assertedStatusCode(t, fExpr);
    }

    if (!code) continue; // this isn't an assertion expression

    // 200 is the default anyway
    if (code !== 200) {
      ensurePropertyValue(
        t,
        'expectedStatusCode',
        t.numericLiteral(code),
        path.node.arguments,
        1
      );
    }

    const sibCount = Array.isArray(fPath.container)
      ? fPath.container.length
      : 1;
    fPath.remove();

    // if this is the only thing in that it(), get rid of it
    if (sibCount < 2) {
      fPath.findParent(isMochaCall.bind(null, t))?.parentPath?.remove();
    }

    return true;
  }

  return true;
}
exports.navigateAndStatusToLoadPage = navigateAndStatusToLoadPage;

/**
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 * @param {string} oldName
 * @param {TestiumMethod} method
 */
function defaultConvert(t, path, oldName, method) {
  const newName =
    method.wdName ||
    (method.assert && `assert${oldName[0].toUpperCase()}${oldName.slice(1)}`);
  if (newName) {
    const callee = /** @type {MemberExpression} */ (path.node.callee);
    if (!t.isIdentifier(callee.property)) throw new Error('not identifier');
    callee.property.name = newName;
  }
}

/**
 * TODO: note docString methods and strip docStrings
 * TODO: detect element-returning-methods and track element bindings for
 * converting (and await-ing) Element method calls
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 * @param {string[]} elemVars
 */
function convertToWDMethod(t, path, elemVars) {
  const assert = isSyncBrowserMethod(t, path.node, { assert: true });
  const element = isSyncBrowserMethod(t, path.node, { element: elemVars });
  if (!assert && !element && !isSyncBrowserMethod(t, path.node)) return;

  const callee = /** @type {MemberExpression} */ (path.node.callee);
  if (!t.isIdentifier(callee.property)) return;

  if (assert) {
    // cut the .assert. out of the member chain
    const objPath = path.get('callee.object');
    if (!Array.isArray(objPath)) {
      const object = /** @type {MemberExpression} */ (callee.object);
      objPath.replaceWith(object.object);
    }
  }

  const oldName = callee.property.name;
  const method = Object.assign(
    {
      convert: defaultConvert,
      assert,
      returnsElement: assert && /^element/.test(oldName),
    },
    testiumMethods[oldName]
  );

  method.convert(t, path, oldName, method);

  if (
    method.returnsElement &&
    t.isVariableDeclarator(path.parent) &&
    t.isIdentifier(path.parent.id)
  ) {
    elemVars.push(path.parent.id.name);
  }
}
exports.convertToWDMethod = convertToWDMethod;

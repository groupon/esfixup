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
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').SpreadElement} SpreadElement
 * @typedef {import('@babel/types').ArgumentPlaceholder} ArgumentPlaceholder
 * @typedef {import('@babel/types').JSXNamespacedName} JSXNamespacedName
 * @typedef {import('@babel/types').ObjectProperty} ObjectProperty
 * @typedef {import('@babel/types').ObjectMethod} ObjectMethod
 * @typedef {import('@babel/types').Identifier} Identifier
 * @typedef {import('@babel/types').StringLiteral} StringLiteral
 * @typedef {import('@babel/types').NumericLiteral} NumericLiteral
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 * @typedef {import('@babel/traverse').NodePath<import('@babel/traverse').Node>} NodePath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 *
 * @typedef TestiumMethod
 * @property {boolean} [returnsElement]
 * @property {string} [wdName]
 * @property {boolean} [assert]
 * @property {boolean} [element]
 * @property {(
 *    t: typeof import('@babel/types'),
 *    path: CallExpressionPath,
 *    oldName?: string,
 *    method?: TestiumMethod
 *  ) => void} [convert]
 */

/**
 * @param {import('@babel/types')} t
 * @param {(ObjectMethod | ObjectProperty | SpreadElement)[]} props
 * @return {[StringLiteral, StringLiteral | NumericLiteral] | null | undefined}
 */
function cookieNameValue(t, props) {
  let name;
  let value;
  for (const prop of props) {
    if (
      !t.isObjectProperty(prop) ||
      !t.isIdentifier(prop.key) ||
      !t.isStringLiteral(prop.value)
    )
      continue;
    if (prop.key.name === 'name') name = prop.value;
    else if (prop.key.name === 'value') value = prop.value;
    else if (prop.key.name !== 'path' || prop.value.value !== '/') return null;
  }
  return name && value && [name, value];
}

/**
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 */
function convertSetCookie(t, path) {
  const opts = path.node.arguments[0];
  if (!opts || !t.isObjectExpression(opts)) return;
  const callee = /** @type {MemberExpression} */ (path.node.callee);
  if (!t.isIdentifier(callee.property)) return;
  const nameVal = cookieNameValue(t, opts.properties);
  if (!nameVal) return;
  path.node.arguments = nameVal;
  callee.property.name = 'setCookieValue';
}

/**
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 */
function convertSetCookies(t, path) {
  const arr = path.node.arguments[0];
  if (!arr || !t.isArrayExpression(arr)) return;
  const callee = /** @type {MemberExpression} */ (path.node.callee);
  if (!t.isIdentifier(callee.property)) return;
  const nameVals = t.objectExpression([]);
  for (const opts of arr.elements) {
    if (!t.isObjectExpression(opts)) return;
    const nameVal = cookieNameValue(t, opts.properties);
    if (!nameVal) return;
    /** @type {StringLiteral | Identifier} */
    let key = nameVal[0];
    const [, value] = nameVal;
    if (/^\w+$/.test(key.value)) key = t.identifier(key.value);
    nameVals.properties.push(t.objectProperty(key, value));
  }
  path.node.arguments = [nameVals];
  callee.property.name = 'setCookieValues';
}

/** @type {Record<string, TestiumMethod>} */
const testiumMethods = {
  getElement: { returnsElement: true },
  getElementOrNull: { returnsElement: true },
  getElements: { returnsElement: false }, // too much trouble
  waitForElementVisible: {
    returnsElement: true,
    wdName: 'waitForElementDisplayed',
  },
  waitForElementNotVisible: {
    returnsElement: true,
    wdName: 'waitForElementNotDisplayed',
  },
  waitForElementExist: { returnsElement: true },
  elementDoesntExist: { assert: true, returnsElement: false },
  httpStatus: { assert: true, wdName: 'assertStatusCode' },
  elementIsVisible: { assert: true, wdName: 'assertElementIsDisplayed' },
  elementNotVisible: { assert: true, wdName: 'assertElementNotDisplayed' },
  setCookie: { convert: convertSetCookie },
  setCookies: { convert: convertSetCookies },

  click: { wdName: 'clickOn' },
  get: { element: true },
  isVisible: { element: true, wdName: 'isDisplayed' },
  movePointerRelativeTo: { element: true, wdName: 'moveTo' },
};
exports.testiumMethods = testiumMethods;

const wdElementMethodNames = Object.keys(testiumMethods)
  .filter(k => testiumMethods[k].element)
  .map(k => testiumMethods[k].wdName || k);

/**
 * validates that a call looks like browser.x() or browser.assert.x(),
 * or someElement.x() and to validate takes
 *
 * @param {import('@babel/types')} t
 * @param {CallExpression} callExpr
 * @param {{ assert?: boolean, element?: string[], name?: string }} [opts]
 */
function isSyncBrowserMethod(t, { callee: c }, opts) {
  if (!opts) opts = {};
  const isAssert = !!opts.assert;
  const { element: elemVars, name } = opts;

  if (!t.isMemberExpression(c)) return false;
  if (!t.isIdentifier(c.property)) return false;
  if (name && c.property.name !== name) return false;

  if (elemVars) {
    const method = testiumMethods[c.property.name];
    return (
      method &&
      method.element &&
      t.isIdentifier(c.object) &&
      elemVars.indexOf(c.object.name) !== -1
    );
  }

  let node;
  if (isAssert) {
    if (
      !(
        t.isMemberExpression(c.object) &&
        t.isIdentifier(c.object.property, { name: 'assert' })
      )
    )
      return false;
    node = c.object.object;
  } else {
    node = c.object;
  }

  return t.isIdentifier(node, { name: 'browser' });
}
exports.isSyncBrowserMethod = isSyncBrowserMethod;

/**
 * might be a call chain already, so need to go up the tree to find `browser`
 *
 * @param {import('@babel/types')} t
 * @param {CallExpression} callExpr
 * @param {string[]} elemVars
 */
function isAsyncBrowserMethod(t, { callee: c }, elemVars) {
  let methodName = null;
  while (t.isMemberExpression(c)) {
    if (t.isIdentifier(c.property)) {
      if (methodName === null) methodName = c.property.name;
      if (c.property.name === 'beforeHook') return false;
    }
    if (t.isIdentifier(c.object) && c.object.name === 'browser') return true;
    if (
      elemVars &&
      methodName &&
      wdElementMethodNames.indexOf(methodName) !== -1 &&
      t.isIdentifier(c.object) &&
      elemVars.indexOf(c.object.name) !== -1
    )
      return true;
    if (!t.isCallExpression(c.object)) return false;
    c = c.object.callee;
  }
  return false;
}
exports.isAsyncBrowserMethod = isAsyncBrowserMethod;

/**
 * @param {import('@babel/types')} t
 * @param {NodePath} path
 */
function isMochaCall(t, path) {
  if (!path) return false;
  const { node } = path;

  if (!t.isCallExpression(node) || !t.isIdentifier(node.callee)) return false;
  const fn = node.callee.name;
  return (
    fn === 'before' ||
    fn === 'it' ||
    fn === 'beforeEach' ||
    fn === 'after' ||
    fn === 'afterEach'
  );
}
exports.isMochaCall = isMochaCall;

/**
 * in a couple of places we need to know which are the sort of mocha functions
 * that can take a callback or expect a returned promise (e.g. not `describe()`)
 *
 * @param {import('@babel/types')} t
 * @param {NodePath} path
 */
function isMochaAction(t, { parentPath: pPath }) {
  return (
    pPath &&
    (isMochaCall(t, pPath) ||
      (t.isCallExpression(pPath.node) &&
        t.isIdentifier(pPath.node.callee, { name: 'coroutine' }) &&
        pPath.parentPath &&
        isMochaCall(t, pPath.parentPath)))
  );
}
exports.isMochaAction = isMochaAction;

// if argument list args has no object in it, add one with { [key]: val }
// if there is an object, but it doesn't have [key], add an entry
// if it does have it, ensure it's set to val
// returns true if set, false if failed, null if already set
/**
 * @param {import('@babel/types')} t
 * @param {string} keyStr
 * @param {Expression | string} valOrStr
 * @param {(Expression | SpreadElement | ArgumentPlaceholder | JSXNamespacedName)[]} args
 * @param {number} [pos]
 */
function ensurePropertyValue(t, keyStr, valOrStr, args, pos = 0) {
  const val =
    typeof valOrStr === 'string' ? t.stringLiteral(valOrStr) : valOrStr;

  let arg = args[pos];
  if (arg) {
    if (!t.isObjectExpression(arg)) return false;
    const prop = /** @type {ObjectProperty | undefined} */ (
      arg.properties.find(
        p =>
          t.isObjectProperty(p) &&
          (t.isStringLiteral(p.key, { value: keyStr }) ||
            t.isIdentifier(p.key, { name: keyStr }))
      )
    );
    if (prop) {
      if (
        (t.isStringLiteral(prop.value) || t.isNumericLiteral(prop.value)) &&
        (t.isStringLiteral(val) || t.isNumericLiteral(val)) &&
        prop.value.value === val.value
      )
        return null;
      prop.value = val;
      return true;
    }
  } else {
    arg = t.objectExpression([]);
    args.splice(pos, 0, arg);
  }

  const key = /^\w+/.test(keyStr)
    ? t.identifier(keyStr)
    : t.stringLiteral(keyStr);
  arg.properties.push(t.objectProperty(key, val));
  return true;
}
exports.ensurePropertyValue = ensurePropertyValue;

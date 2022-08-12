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

const { isMochaAction, ensurePropertyValue } = require('./common');

/**
 * @typedef {import('@babel/traverse').Binding} Binding
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Program>} ProgramPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ThisExpression>} ThisExpressionPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ReturnStatement>} ReturnStatementPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/traverse').Node>} NodePath
 */

/**
 *
 * too lazy to actually check for the different ways you might have require()d
 * testium-mocha - let's just assume you called your var `browser`
 * null => no browser
 * [...] => browser.beforeHook references
 * false => found browser.loadPage (probably already wd!)
 *
 * @param {import('@babel/types')} t
 * @param {ProgramPath} path
 */
function findBeforeHookRefs(t, path) {
  const browser = path.scope.getOwnBinding('browser');
  if (!browser) return null;
  let foundLoadPage = false;
  const res = browser.referencePaths.flatMap(p => {
    const pPath = p.parentPath;
    if (!pPath) return [];
    if (
      t.isMemberExpression(pPath.node) &&
      t.isIdentifier(pPath.node.property)
    ) {
      if (pPath.node.property.name === 'beforeHook') return [pPath];
      if (pPath.node.property.name === 'loadPage') foundLoadPage = true;
    }
    return [];
  });
  return foundLoadPage ? false : res;
}

/**
 * @param {import('@babel/types')} t
 * @param {ProgramPath} path
 */
function findInjectBrowser(t, path) {
  for (const expr of path.node.body) {
    if (!t.isVariableDeclaration(expr)) continue;
    for (const decl of expr.declarations) {
      if (!t.isIdentifier(decl.id)) continue;
      if (!t.isCallExpression(decl.init)) continue;
      if (!t.isIdentifier(decl.init.callee, { name: 'require' })) continue;
      const lib = decl.init.arguments[0];
      if (!t.isStringLiteral(lib)) continue;
      if (lib.value === 'testium/mocha') lib.value = 'testium-mocha';
      else if (lib.value !== 'testium-mocha') continue;
      return path.scope.getOwnBinding(decl.id.name);
    }
  }
  return null;
}

// TODO: add more
const WD_METHODS = new Set([
  'loadPage',
  'setCookieValue',
  'assertElementExists',
]);

/**
 *
 * @param {import('@babel/core').types} t
 * @param {import('@babel/core').NodePath} progPath
 */
function alreadyDone(t, progPath) {
  let done = false;
  progPath.traverse({
    MemberExpression(path) {
      if (
        t.isIdentifier(path.node.property) &&
        WD_METHODS.has(path.node.property.name)
      ) {
        done = true;
        path.stop();
      }
    },
  });
  return done;
}
exports.alreadyDone = alreadyDone;

/**
 * @param {import('@babel/types')} t
 * @param {ProgramPath} progPath
 * @param {boolean} defWD
 */
function injectBrowserToBeforeHook(t, progPath, defWD) {
  /** @type {boolean | null | undefined | NodePath[]} */
  let refs = findBeforeHookRefs(t, progPath);
  if (refs === false) return false;

  /** @type {Binding | null | undefined} */
  let injectBrowser;
  if (!refs) {
    injectBrowser = findInjectBrowser(t, progPath);
    refs = injectBrowser && injectBrowser.referencePaths;
  }

  // if no beforeHook and no injectBrowser, this isn't testium!
  if (!refs) return false;

  // injectBrowser() => browser.beforeHook({ driver: 'wd' })
  for (const ref of refs) {
    const call = ref.parent;
    if (!t.isCallExpression(call) || Array.isArray(call)) continue;
    if (!defWD) ensurePropertyValue(t, 'driver', 'wd', call.arguments);
    if (injectBrowser) {
      ref.replaceWith(
        t.memberExpression(t.identifier('browser'), t.identifier('beforeHook'))
      );
    }
  }

  if (injectBrowser) {
    // const injectBrowser = require('testium-mocha');
    // => const { browser } = require('testium-mocha');
    const idPath = injectBrowser.path.get('id');
    if (Array.isArray(idPath)) return false;
    idPath.replaceWith(
      t.objectPattern([
        t.objectProperty(
          t.identifier('browser'),
          t.identifier('browser'),
          false,
          true
        ),
      ])
    );
  }

  return true;
}
exports.injectBrowserToBeforeHook = injectBrowserToBeforeHook;

/**
 * @param {import('@babel/types')} t
 * @param {ThisExpressionPath} path
 */
function nukeThisDotBrowser(t, path) {
  if (!t.isMemberExpression(path.parent)) return;
  if (!t.isIdentifier(path.parent.property, { name: 'browser' })) return;
  path.parentPath.replaceWith(t.identifier('browser'));
}
exports.nukeThisDotBrowser = nukeThisDotBrowser;

/**
 *
 * the decaf transformer leaves some occasional code with a `return` on the
 * last expression, which breaks our cleanup - since we know that this code
 * is sync-driver code, its return values are always irrelevant, so we can
 * kill them
 *
 * @param {import('@babel/types')} t
 * @param {ReturnStatementPath} path
 */
function removeSpuriousReturns(t, path) {
  // iff we're the last statement
  if (!path.inList) return;
  if (!Array.isArray(path.container) || path.key !== path.container.length - 1)
    return;

  if (
    path.parentPath.parentPath &&
    isMochaAction(t, path.parentPath.parentPath) &&
    path.node.argument
  ) {
    path.replaceWith(path.node.argument);
  }
}
exports.removeSpuriousReturns = removeSpuriousReturns;

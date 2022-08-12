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

// called repeatedly on CallExpressions, adds each browser.x() to an array
// of sequential calls it finds, stored in `this`

/**
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Expression>} ExpressionPath
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 */

const { isAsyncBrowserMethod } = require('./common');

/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath[][]} chains
 * @param {string[]} elemVars
 * @param {CallExpressionPath} path
 */
function findCallChains(t, chains, elemVars, path) {
  if (!isAsyncBrowserMethod(t, path.node, elemVars)) return;
  const expr = path.parentPath;
  if (expr.inList && expr.key > 0) {
    let firstCall = path;
    for (let i = /** @type {number} */ (expr.key) - 1; i >= 0; i--) {
      const sib = /** @type {ExpressionPath} */ (
        expr.getSibling(i).get('expression')
      );
      if (
        sib.node &&
        t.isCallExpression(sib.node) &&
        isAsyncBrowserMethod(t, sib.node, elemVars)
      )
        firstCall = /** @type {CallExpressionPath} */ (sib);
      else break;
    }
    const chain = chains.find(c => c[0] === firstCall);
    if (chain) return void chain.push(path);
  }
  chains.push([path]);
}
exports.findCallChains = findCallChains;

// given the array of chains built by findCallChains(), turns a series of
// calls like browser.x(); browser.y(); into browser.x().y();
// then checks to see if it's the only expression, if so makes it a single
// return statement, otherwise puts each chain in a `await` expression
/**
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath[][]} chains
 */
function buildAwaitCallChains(t, chains) {
  for (const chain of chains) {
    const callChain = chain[0];
    chain.slice(1).forEach(call => {
      callChain.replaceWith(
        t.callExpression(
          t.memberExpression(
            callChain.node,
            /** @type {MemberExpression} */ (call.node.callee).property
          ),
          call.node.arguments
        )
      );
      call.remove();
    });
    if (
      t.isExpressionStatement(callChain.parent) &&
      Array.isArray(callChain.parentPath.container) &&
      callChain.parentPath.container.length === 1 &&
      t.isBlockStatement(callChain.parentPath.parent) &&
      t.isFunction(callChain.parentPath.parentPath?.parent)
    ) {
      callChain.parentPath.replaceWith(t.returnStatement(callChain.node));
    } else {
      callChain.replaceWith(t.awaitExpression(callChain.node));
    }
  }
}
exports.buildAwaitCallChains = buildAwaitCallChains;

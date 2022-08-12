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
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('.').AssertState} AssertState
 * @typedef {babel.types.Expression} Expression
 */

/**
 * NOTE: this also replaces a destructured <fn> with assertive.<originalFn>
 *
 * @param {string} name
 * @param {BabelTypes} t
 * @param {AssertState} state
 * @param {CallExpressionPath} path
 */
function isAssertiveCall(name, t, state, path) {
  const { callee } = path.node;
  if (!state.assertive) return false;
  if (state.assertive === true) {
    if (
      !t.isMemberExpression(callee) ||
      !t.isIdentifier(callee.object, { name: 'assertive' }) ||
      !t.isIdentifier(callee.property, { name })
    ) {
      return false;
    }
  } else if (typeof state.assertive === 'object') {
    if (!t.isIdentifier(callee, { name: state.assertive[name] })) return false;
    // make sure <customName>() is now assertive.<name>()
    path.node.callee = t.memberExpression(
      t.identifier('assertive'),
      t.identifier(name)
    );
  }

  return true;
}
exports.isAssertiveCall = isAssertiveCall;

/**
 * if we're inside an expression that's returned, awaited, or assigned to a
 * variable, we probably shouldn't try to rewrite the function; assertive could
 * have been handling promises for any of its arguments
 *
 * however, if it's specifically doesNotReject() or rejects(), and it's a return
 * to an it() function, we're probably ok
 *
 * TODO: detect unconsumed await cases and replace them with awaited args, e.g.:
 *   await match(re, returnsAPromise());
 * can *probably* be rewritten "safely" as:
 *   match(await returnsAPromise(), re);
 *
 * @param {BabelTypes} t
 * @param {CallExpressionPath} path
 * @param {boolean} okToReturnInIt
 */
function isUsedUnsafely(t, path, okToReturnInIt) {
  let p = path.parentPath;
  while (p) {
    // e.g. return [{ foo: assert.something() }];
    // or () => [assert.something()]
    if (t.isReturnStatement(p.node) || t.isArrowFunctionExpression(p.node)) {
      if (okToReturnInIt) {
        // it(..., () => ...)
        const f = p.find(pp => t.isFunction(pp.node));
        if (
          f &&
          t.isCallExpression(f.parent) &&
          t.isIdentifier(f.parent.callee, { name: 'it' })
        ) {
          return false;
        }
      }
      return true;
    }

    // return void assert.blah(); is NOT unsafe
    if (t.isUnaryExpression(p.node, { operator: 'void' })) return false;

    // x = assert.blah(); IS unsafe
    if (t.isVariableDeclarator(p.node)) return true;

    // something(assert.blah()); IS unsafe
    if (t.isCallExpression(p.node)) return true;

    // assert().then(() => ...) IS unsafe
    if (t.isMemberExpression(p.node)) return true;

    // await assert.blah(); IS automatically unsafe unless we're ok to
    // be in an it() in which case we need to check to see if we're ever
    // assigned to anything
    if (t.isAwaitExpression(p.node) && !okToReturnInIt) return true;

    // if we're in a statement without anything bad happening, NOT unsafe
    if (!t.isExpression(p.node)) return false;

    // fell through to here?  check our parent
    if (!p.parentPath) return false;
    p = p.parentPath;
  }
  return false;
}

/**
 * turns callee of call expression into destructured or regular assert call
 * if it can, return array of args with msg reordered to the end
 * if it can't, return null
 *
 * @param {string} name
 * @param {number} numArgs
 * @param {BabelTypes} t
 * @param {AssertState} state
 * @param {CallExpressionPath} path
 * @returns {Expression[] | null}
 */
function fixAssertCall(name, numArgs, t, state, path) {
  if (isUsedUnsafely(t, path, ['doesNotReject', 'rejects'].includes(name))) {
    return null;
  }

  const args = path.node.arguments;
  // don't try to handle spread expressions, etc
  if (!args.every(arg => t.isExpression(arg))) return null;

  // move leading msg to end
  if (args.length === numArgs + 1) {
    const msg = args.shift();
    if (msg) args.push(msg);
  } else if (args.length !== numArgs) {
    return null;
  }

  if (state.assert && typeof state.assert === 'object') {
    let alias = name;
    if (state.assert[name]) alias = name;
    else state.assert[name] = name;
    path.node.callee = t.identifier(alias);
  } else {
    path.node.callee = t.memberExpression(
      t.identifier('assert'),
      t.identifier(name)
    );
  }
  state.dirty = true;

  return /** @type {Expression[]} */ (args);
}
exports.fixAssertCall = fixAssertCall;

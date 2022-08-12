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

// we don't know what to do with it(), before(), etc that take a callback arg,
// so for now just put a `throw` at the beginning

const { isMochaAction } = require('./common');

/**
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Function>} FunctionPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/traverse').Node>} NodePath
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {import('@babel/types').ReturnStatement} ReturnStatement
 * @typedef {import('@babel/types').Identifier} Identifier
 * @typedef {import('@babel/types').RestElement} RestElement
 * @typedef {import('@babel/types').Pattern} Pattern
 */

/**
 * @param {import('@babel/types')} t
 * @param {FunctionPath} path
 */
function errorOnDone(t, path) {
  const p0 = path.node.params[0];
  if (!isMochaAction(t, path) || !p0) return;

  const body = /** @type {NodePath} */ (path.get('body.body.0'));
  const descr = t.isIdentifier(p0) ? p0.name : '???';
  body.insertBefore(
    t.throwStatement(
      t.newExpression(t.identifier('Error'), [
        t.stringLiteral(`Can't autoconvert mocha with ${descr} callback`),
      ])
    )
  );
}

/**
 * @param {FunctionPath} path
 * @param {string} type
 */
function hasType(path, type) {
  let seen = false;
  path.traverse({
    // @ts-ignore
    [type](p) {
      seen = true;
      p.stop();
    },
    Function(p) {
      p.stop();
    },
  });
  return seen;
}

/** @param {FunctionPath} path */
function hasAwaits(path) {
  return hasType(path, 'AwaitExpression');
}

/** @param {FunctionPath} path */
function hasThis(path) {
  return hasType(path, 'ThisExpression');
}

/**
 * @param {import('@babel/types')} t
 * @param {BlockStatement} stmt
 */
function justReturns(t, stmt) {
  return stmt.body.length === 1 && t.isReturnStatement(stmt.body[0]);
}

/**
 * @param {import('@babel/types')} t
 * @param {any} params
 * @return {params is (Identifier | RestElement | Pattern)[]}
 */
function allNormalParams(t, params) {
  return (
    Array.isArray(params) &&
    params.every(p => t.isIdentifier(p) || t.isRestElement(p) || t.isPattern(p))
  );
}

// given the array of functions that we know need cleaning up (because we
// put `await` or `return` in them in `buildAwaitCallChains`), perform
// one of a number of potential cleanups
/**
 * @param {import('@babel/types')} t
 * @param {FunctionPath[]} fns
 */
function fixupFunctions(t, fns) {
  for (const path of fns) {
    errorOnDone(t, path);

    // TODO: figure out how to cleanup things like:
    // before(async () => await browser.clearCookies());
    if (hasAwaits(path)) {
      path.node.async = true;
    } else {
      const stmt = /** @type {BlockStatement} */ (path.node.body);
      if (justReturns(t, stmt)) {
        if (!hasThis(path)) {
          const arg = /** @type {ReturnStatement} */ (stmt.body[0]).argument;
          const { params } = path.node;
          if (arg && allNormalParams(t, params)) {
            path.replaceWith(t.arrowFunctionExpression(params, arg));
          }
        }
      } else {
        throw new Error('everything should have an await or just a return');
      }
    }
  }
}
exports.fixupFunctions = fixupFunctions;

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

const debug = require('debug')('transform:assert:cleanup-requires');

const isRequireOf = require('../../is-require-of');

/**
 * @typedef {import('./').AssertState} AssertState
 * @typedef {import('@babel/types').ObjectPattern} ObjectPattern
 * @typedef {import('@babel/types').ObjectProperty} ObjectProperty
 * @typedef {import('@babel/types').Identifier} Identifier
 */

/**
 *
 * @param {import('@babel/types')} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {{ opts: AssertState }} transformOpts
 */
function cleanupRequires(t, path, { opts: state }) {
  if (!state.dirty) return;

  if (state.assert) {
    // if we had a destructured assert, then add any missing destructures we
    // need
    if (state.assert !== true) {
      // find the var decl
      /** @type {ObjectPattern | null} */
      let assertDeclPat = null;
      for (const expr of path.node.body) {
        if (!t.isVariableDeclaration(expr)) continue;
        // normalize each of assert & assertive requires
        for (const decl of expr.declarations) {
          if (isRequireOf('assert', t, decl) && t.isObjectPattern(decl.id)) {
            assertDeclPat = decl.id;
            break;
          }
        }
      }
      if (!assertDeclPat) {
        debug('Could not find assert declaration; wtf');
        return;
      }
      for (const [name, alias] of Object.entries(state.assert)) {
        if (name !== alias) continue;
        if (
          !assertDeclPat.properties.some(
            p => t.isObjectProperty(p) && t.isIdentifier(p.key, { name })
          )
        ) {
          assertDeclPat.properties.push(
            t.objectProperty(
              t.identifier(name),
              t.identifier(name),
              !'computed',
              !!'shorthand'
            )
          );
        }
      }
    }
  } else {
    // if we never (before) had an assert require, add one
    path.node.body.unshift(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('assert'),
          t.callExpression(t.identifier('require'), [t.stringLiteral('assert')])
        ),
      ])
    );
  }
}

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
function cleanupRequiresPlugin({ types: t }) {
  return { visitor: { Program: cleanupRequires.bind(null, t) } };
}
module.exports = cleanupRequiresPlugin;

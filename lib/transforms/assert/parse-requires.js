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

// checks the requires of assert & assertive and updates the state
// and replaces any assertive require with explicit: assertive =

const isRequireOf = require('../../is-require-of');
const parseDestructure = require('./parse-destructure');

/**
 * @typedef {import('./').AssertState} AssertState
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/types').ObjectProperty} ObjectProperty
 * @typedef {import('@babel/types').Identifier} Identifier
 */

/**
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {{ opts: AssertState }} transformOpts
 */
function normalizeRequires(t, path, { opts: state }) {
  // only look at toplevel prog requires
  for (const expr of path.node.body) {
    if (!t.isVariableDeclaration(expr)) continue;
    // normalize each of assert & assertive requires
    for (const decl of expr.declarations) {
      for (const name of /** @type {('assert'|'assertive')[]} */ ([
        'assert',
        'assertive',
      ])) {
        if (!isRequireOf(name, t, decl)) continue;

        if (t.isObjectPattern(decl.id)) {
          // const { match } = require('assert');
          state[name] = Object.fromEntries(
            parseDestructure(t, decl.id.properties)
          );
        } else if (t.isIdentifier(decl.id)) {
          // const assert = require('assert');
          state[name] = true;
          if (decl.id.name !== name) path.scope.rename(decl.id.name, name);
        }
      }
    }
  }
}

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
function normalizeRequiresPlugin({ types: t }) {
  return { visitor: { Program: normalizeRequires.bind(null, t) } };
}
module.exports = normalizeRequiresPlugin;

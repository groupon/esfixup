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

/*
function which returns whether a given NodePath to a CallExpression is
an invocation of the given lodash function

e.g. for name='assign', we check if the callee corresponds to any of:
const a = require('lodash/assign');      // #1 a()
const b = require('lodash.assign');      // #2 b()
const { assign: c } = require('lodash'); // #3 c()
const d = require('lodash');             // #4 d.assign()
*/

const isRequireOf = require('../../is-require-of');

/**
 * @param {import('@babel/types')} t
 * @param {string|string[]} namesAndAliases
 * @param {import('@babel/core').NodePath<import('@babel/types').CallExpression>} path
 */
function isLodashCall(t, namesAndAliases, path) {
  const {
    node: { callee },
  } = path;

  if (!Array.isArray(namesAndAliases)) {
    namesAndAliases = [namesAndAliases];
  }

  for (const name of namesAndAliases) {
    // cases #1, 2, or 3 from above
    if (t.isIdentifier(callee)) {
      // check if the simple identifier corresponds to a require matching lodash
      const binding = path.scope.getBinding(callee.name);
      const bPath = binding && binding.path;
      if (!bPath) return false;
      const required = isRequireOf(
        new RegExp(`^lodash(?:[/.]${name})?$`, 'i'),
        t,
        bPath.node
      );
      if (!required) return false;

      // if they did require('lodash/foo') or require('lodash.foo'), it's good
      if (required !== 'lodash') return true;

      // else we need to verify that this is actually the right function from
      // the monolithic 'lodash' require destructure
      const { node } = bPath;
      if (!t.isVariableDeclarator(node)) return false;
      // make sure it's something like const { x, y } = require('lodash');
      if (!t.isObjectPattern(node.id)) return false;
      // if one of the properties is the identifier that led us here, we're good
      return node.id.properties.some(
        p =>
          t.isObjectProperty(p) &&
          t.isIdentifier(p.key, { name }) &&
          t.isIdentifier(p.value, { name: callee.name })
      );
    } else if (
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property, { name }) &&
      t.isIdentifier(callee.object)
    ) {
      // case #4 from above
      const binding = path.scope.getBinding(callee.object.name);
      // if we found the binding and it points to a require of lodash
      return !!(
        binding &&
        binding.path &&
        isRequireOf('lodash', t, binding.path.node)
      );
    }
  }

  return false;
}

module.exports = isLodashCall;

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
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').Scope} Scope
 * @typedef {import('@babel/traverse').Node} Node
 */

const camelCase = require('lodash.camelcase');

const CAMEL_PATTERN = /^[a-z].*_/;

/**
 * @param {Scope} scope
 * @param {string} niceId
 */
function ensureUniq(scope, niceId) {
  return scope.hasBinding(niceId)
    ? scope.generateUidIdentifier(niceId).name
    : niceId;
}

/**
 * @param {import('@babel/types')} t
 * @param {Scope} scope
 * @param {Node} id
 */
function ensureCamelCase(t, scope, id) {
  if (t.isArrayPattern(id)) {
    id.elements.forEach(e => t.isNode(e) && ensureCamelCase(t, scope, e));
    return;
  } else if (t.isObjectPattern(id)) {
    id.properties.forEach(prop => {
      if (t.isObjectProperty(prop)) ensureCamelCase(t, scope, prop.value);
    });
    return;
  } else if (!t.isIdentifier(id)) {
    return;
  }

  if (CAMEL_PATTERN.test(id.name)) {
    scope.rename(id.name, ensureUniq(scope, camelCase(id.name)));
  }
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function useCamelCase({ types: t }) {
  return {
    visitor: {
      VariableDeclaration(path) {
        const decls = path.node.declarations;
        decls.forEach(decl => {
          ensureCamelCase(t, path.scope, decl.id);
        });
      },

      Function(path) {
        path.node.params.forEach(param => {
          ensureCamelCase(t, path.scope, param);
        });

        // We really don't want to rename class or object methods
        if (
          (t.isFunctionExpression(path.node) ||
            t.isFunctionDeclaration(path.node)) &&
          path.node.id
        ) {
          ensureCamelCase(t, path.scope, path.node.id);
        }
      },
    },
  };
}
module.exports = useCamelCase;

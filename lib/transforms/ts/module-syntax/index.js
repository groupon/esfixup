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

const t = require('@babel/types');
const { handleSingleExport, handleBulkExport } = require('./exports');
const { handleDebug, handleRequire } = require('./imports');
const debug = require('debug')('transform:ts:module-syntax');

/** @returns {{ visitor: babel.Visitor }} */
function moduleSyntax() {
  return {
    visitor: {
      Directive(path) {
        if (path.node.value.value === 'use strict') path.remove();
      },

      VariableDeclaration(path) {
        // verify we have exactly "= require(...)"
        if (path.node.declarations.length !== 1) return;
        let { init: req } = path.node.declarations[0];

        // handle ESM/TS style "export default" case
        // const foo = require('foo').default;
        if (
          t.isMemberExpression(req) &&
          t.isIdentifier(req.property, { name: 'default' })
        ) {
          req = req.object;
        }

        if (!t.isCallExpression(req)) return;

        // if it's like = require(...)(...), see if it's debug() special-case
        if (!t.isIdentifier(req.callee, { name: 'require' })) {
          handleDebug(path, req);
          return;
        }
        if (!t.isProgram(path.parent)) {
          debug('Not handling non-toplevel require');
          return;
        }
        if (!t.isStringLiteral(req.arguments[0])) {
          debug('Not handling non-string-literal require');
          return;
        }

        // otherwise, assume it's a simple
        handleRequire(path, req.arguments[0]);
      },

      AssignmentExpression(path) {
        if (!t.isProgram(path.parentPath.parent)) return;
        if (!t.isMemberExpression(path.node.left)) return;

        if (
          t.isIdentifier(path.node.left.object, { name: 'exports' }) &&
          t.isIdentifier(path.node.left.property)
        ) {
          handleSingleExport(path, path.node.left.property);
        } else if (
          t.isIdentifier(path.node.left.object, { name: 'module' }) &&
          t.isIdentifier(path.node.left.property, { name: 'exports' })
        ) {
          handleBulkExport(path);
        }
      },
    },
  };
}
exports.moduleSyntax = moduleSyntax;

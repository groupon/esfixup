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
 */

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function removeNoErrDeclaration({ types: t }) {
  return {
    visitor: {
      VariableDeclaration(path) {
        if (!t.isProgram(path.parent)) return;

        const decls = path.node.declarations;
        if (
          decls.length === 1 &&
          t.isIdentifier(decls[0].id, { name: 'noErr' }) &&
          t.isNullLiteral(decls[0].init)
        ) {
          path.remove();
        }
      },
    },
  };
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function removeUnboundNoErr({ types: t }) {
  return {
    visitor: {
      Identifier(path) {
        if (path.node.name === 'noErr' && !path.scope.hasBinding('noErr')) {
          path.replaceWith(t.nullLiteral());
        }
      },
    },
  };
}

module.exports = {
  removeNoErrDeclaration,
  removeUnboundNoErr,
};

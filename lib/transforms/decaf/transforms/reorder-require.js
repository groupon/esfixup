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

const isBuiltin = require('is-builtin-module');
const sortBy = require('lodash.sortby');

/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').Node} Node
 * @typedef {import('@babel/types').Statement} Statement
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').VariableDeclaration} VariableDeclaration
 */

// This is just used for alphabetic sorting
const PRIO_NATIVE = 1;
const PRIO_THIRD_PARTY = 2;
const PRIO_RELATIVE = 3;
const PRIO_SIBLING = 4;

/** @type {Set<Node>} */
const seen = new Set();

/** @param {string} moduleId */
function getModulePriority(moduleId) {
  if (moduleId[0] === '.') {
    return moduleId[1] === '.' ? PRIO_RELATIVE : PRIO_SIBLING;
  }
  return isBuiltin(moduleId) ? PRIO_NATIVE : PRIO_THIRD_PARTY;
}

/** @param {{ moduleId: string }} obj */
function mapForCompare({ moduleId }) {
  return `${getModulePriority(moduleId)}:${moduleId}`;
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function reorderRequire({ types: t }) {
  /** @param {Node} node */
  function getModuleIdFromExpression(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'require' }) &&
      node.arguments.length === 1 &&
      t.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].value
    );
  }

  /** @param {Statement} node */
  function getModuleIdFromLine(node) {
    if (
      !t.isVariableDeclaration(node, { kind: 'const' }) ||
      node.declarations.length !== 1
    ) {
      return null;
    }
    const { init } = node.declarations[0];

    if (!init) return null;

    return (
      getModuleIdFromExpression(init) ||
      (t.isMemberExpression(init) && getModuleIdFromExpression(init.object)) ||
      (t.isCallExpression(init) && getModuleIdFromExpression(init.callee)) ||
      null
    );
  }

  return {
    visitor: {
      Program(path) {
        if (seen.has(path.node)) return;
        const lines = path.node.body;

        /** @type {{ moduleId: string, line: VariableDeclaration }[]} */
        const requires = [];
        /** @type {Statement[]} */
        const newLines = [];

        function flushRequire() {
          if (!requires.length) return;

          const sorted = sortBy(requires, mapForCompare);
          requires.length = 0;
          sorted.forEach(e => {
            newLines.push(t.variableDeclaration('const', e.line.declarations));
          });
        }

        lines.forEach(line => {
          const moduleId = getModuleIdFromLine(line);
          if (moduleId) {
            const varDecl = /** @type {VariableDeclaration} */ (line);
            requires.push({ moduleId, line: varDecl });
          } else {
            flushRequire();
            newLines.push(line);
          }
        });
        flushRequire();

        // path.node.body = newLines;
        const newProgram = t.program(newLines, path.node.directives);
        seen.add(newProgram);
        path.replaceWith(newProgram);
      },
    },
  };
}
module.exports = reorderRequire;

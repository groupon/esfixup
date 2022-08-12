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
const debug = require('debug')('transform:ts:module-syntax:imports');

/**
 * converts top-level require(blah) to import blah
 *
 * @param {import('@babel/traverse').NodePath<babel.types.VariableDeclaration>} path
 * @param {babel.types.StringLiteral} sourceLiteral
 */
function handleRequire(path, sourceLiteral) {
  const { id } = path.node.declarations[0];
  /** @type {(babel.types.ImportDefaultSpecifier | babel.types.ImportSpecifier)[]} */
  let specifiers;
  if (t.isIdentifier(id)) {
    specifiers = [t.importDefaultSpecifier(id)];
  } else if (t.isObjectPattern(id)) {
    /** @type {babel.types.Identifier | null} */
    let defaultId = null;
    specifiers = id.properties.flatMap(p => {
      if (
        t.isObjectProperty(p) &&
        t.isIdentifier(p.key) &&
        t.isIdentifier(p.value)
      ) {
        if (p.key.name === 'default') defaultId = p.value;
        else return t.importSpecifier(p.value, p.key);
      }
      return [];
    });
    if (defaultId) specifiers.unshift(t.importDefaultSpecifier(defaultId));
  } else {
    debug('Not handling non-standard require assignment');
    return;
  }

  path.replaceWith(t.importDeclaration(specifiers, sourceLiteral));
}
exports.handleRequire = handleRequire;

/**
 * special-case for: const debug = require('debug')('name');
 *
 * @param {import('@babel/traverse').NodePath<babel.types.VariableDeclaration>} path
 * @param {babel.types.CallExpression} init
 */
function handleDebug(path, init) {
  if (!t.isCallExpression(init.callee)) return;
  if (!t.isIdentifier(init.callee.callee, { name: 'require' })) return;
  if (!t.isProgram(path.parent)) {
    debug('Not handling non-toplevel require-returns-a-function');
    return;
  }
  if (
    !t.isStringLiteral(init.callee.arguments[0], {
      value: 'debug',
    }) ||
    !t.isExpression(init.arguments[0])
  ) {
    debug('Unhandled require-returns-a-function case');
    return;
  }

  // append: const debug = Debug('blah');
  path.insertAfter(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('debug'),
        t.callExpression(t.identifier('Debug'), [init.arguments[0]])
      ),
    ])
  );

  // replace require with: import Debug from 'debug';
  path.replaceWith(
    t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('Debug'))],
      t.stringLiteral('debug')
    )
  );
}
exports.handleDebug = handleDebug;

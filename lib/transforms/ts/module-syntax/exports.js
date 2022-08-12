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

/**
 * @typedef {import('@babel/traverse').NodePath<babel.types.AssignmentExpression>} AssignmentExpressionPath
 */

/**
 * @param {AssignmentExpressionPath} path
 * @param {babel.types.Identifier} id
 */
function handleSingleExport(path, id) {
  if (t.isIdentifier(path.node.right)) {
    const binding = path.scope.getBinding(path.node.right.name);
    if (!binding || !t.isDeclaration(binding.path.node)) return;
    binding.path.replaceWith(t.exportNamedDeclaration(binding.path.node, []));
    path.parentPath.remove();
  } else {
    path.parentPath.replaceWith(
      t.exportNamedDeclaration(
        t.variableDeclaration('const', [
          t.variableDeclarator(id, path.node.right),
        ]),
        []
      )
    );
  }
}
exports.handleSingleExport = handleSingleExport;

/** @param {AssignmentExpressionPath} path */
function handleBulkExport(path) {
  const { right } = path.node;

  if (t.isIdentifier(right)) {
    handleDefaultExport(path);
    return;
  }

  if (
    !t.isObjectExpression(right) ||
    !right.properties.every(
      p =>
        // no ...rest stuff
        t.isObjectProperty(p) &&
        // simple foo:
        t.isIdentifier(p.key) &&
        // has to be either { foo: foo } or { foo: 42 }; no { foo: bar }
        (t.isIdentifier(p.value)
          ? p.value.name === p.key.name
          : t.isExpression(p.value))
    )
  ) {
    // fallback is export = ...
    path.parentPath.replaceWith(t.tsExportAssignment(path.node.right));
    return;
  }

  for (const prop of right.properties) {
    if (!t.isObjectProperty(prop)) return;
    if (!t.isIdentifier(prop.key)) return;
    if (t.isIdentifier(prop.value)) {
      // our previous filter guarantees this is foo: foo
      const binding = path.scope.getBinding(prop.key.name);
      if (!binding || !t.isDeclaration(binding.path.node)) return;
      binding.path.replaceWith(t.exportNamedDeclaration(binding.path.node, []));
    } else {
      if (!t.isExpression(prop.value)) return;
      path.insertAfter(
        t.exportNamedDeclaration(
          t.variableDeclaration('const', [
            t.variableDeclarator(prop.key, prop.value),
          ]),
          []
        )
      );
    }
  }

  path.parentPath.remove();
}
exports.handleBulkExport = handleBulkExport;

// TODO: DRY w/ handleSingleExport()
/** @param {AssignmentExpressionPath} path */
function handleDefaultExport(path) {
  const binding =
    t.isIdentifier(path.node.right) &&
    path.scope.getBinding(path.node.right.name);
  if (
    binding &&
    (t.isExpression(binding.path.node) ||
      t.isClassDeclaration(binding.path.node) ||
      t.isFunctionDeclaration(binding.path.node))
  ) {
    binding.path.replaceWith(t.exportDefaultDeclaration(binding.path.node));
    path.parentPath.remove();
  }
}

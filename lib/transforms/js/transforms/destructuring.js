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

// 1) function fn(args) { const x = args.x; ... // no other use of args }
//    => function fn({ x }) { ... }
// 2) all other blocks of property assignments from same object are
//    also converted to destructures

/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Node>} NodePath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').VariableDeclarator>} VariableDeclaratorPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Program>} ProgramPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Function>} FunctionPath
 * @typedef {import('@babel/traverse').Binding} Binding
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').Identifier} Identifier
 * @typedef {import('@babel/types').NumericLiteral} NumericLiteral
 * @typedef {{
 *   objectBinding: false | undefined | Binding;
 *   object: Expression;
 *   key: string | number;
 *   value: string;
 *   path: VariableDeclaratorPath;
 *   array: boolean;
 * }} PropAssign
 * @typedef {PropAssign & { array: true, key: number }} ArrayPropAssign
 * @typedef {PropAssign & { array: false, key: string }} ObjectPropAssign
 * @typedef {import('@babel/types').VariableDeclaration} VariableDeclaration
 */

/**
 * @param {import('@babel/types')} t
 * @param {PropAssign[]} assigns
 */
function buildDestructure(t, assigns) {
  if (assigns[0].array) {
    const sorted = /** @type {ArrayPropAssign[]} */ (assigns).sort(
      (a, b) => a.key - b.key
    );
    return t.arrayPattern(
      Array(sorted[sorted.length - 1].key + 1)
        .fill(null)
        .map((x, i) => {
          const assignI = assigns.find(a => a.key === i);
          if (!assignI) throw new Error(`missing index ${i}`);
          return t.identifier(assignI.value);
        })
    );
  } else {
    return t.objectPattern(
      /** @type {ObjectPropAssign[]} */ (assigns).map(a =>
        t.objectProperty(
          t.identifier(a.key),
          t.identifier(a.value),
          false,
          a.key === a.value
        )
      )
    );
  }
}

/**
 * @param {PropAssign[]} assigns
 */
function deleteAssigns(assigns) {
  assigns.forEach(a => {
    if (
      /** @type {VariableDeclaration} */ (a.path.parent).declarations.length ===
      1
    )
      a.path.parentPath.remove();
    else a.path.remove();
  });
}

/**
 * @param {PropAssign[]} propAssigns
 * @param {import('@babel/types')} t
 * @param {VariableDeclaratorPath} path
 */
function findPropAssigns(propAssigns, t, path) {
  const d = path.node;
  if (/** @type {VariableDeclaration} */ (path.parent).kind === 'var') {
    return; // let's just worry about block scoping
  }
  if (!t.isIdentifier(d.id)) return;
  if (!t.isMemberExpression(d.init)) return;
  // TODO: support more complex destructuring
  // like const x = a.b.c; => const { b: { c: x } } = a;
  const { computed } = d.init;

  const prop = d.init.property;
  if (!t.isExpression(prop)) return;
  const array =
    computed &&
    t.isNumericLiteral(prop) &&
    Number.isInteger(prop.value) &&
    prop.value >= 0;

  // don't bother with foo[37]
  if (array && /** @type {NumericLiteral} */ (prop).value > 9) return;

  // don't deal with foo[bar] (vs. foo.bar)
  if (!array && (computed || !t.isIdentifier(prop))) return;

  const objectBinding =
    t.isIdentifier(d.init.object) && path.scope.getBinding(d.init.object.name);
  if (!t.isIdentifier(prop) && !t.isNumericLiteral(prop)) return;
  const key = t.isIdentifier(prop) ? prop.name : prop.value;
  const value = d.id.name;

  propAssigns.push({
    objectBinding,
    object: d.init.object,
    key,
    value,
    path,
    array,
  });
}

// in theory, make sure we don't have huge gaps like [0] and [5]
// in practice, babel won't let us create a t.arrayPattern([null, ...]) even
//   though it's fine parsing it, so we'll just require that there be no gaps
//   for now :-((
/** @param {ArrayPropAssign[]} propAssigns */
function sparseIndices(propAssigns) {
  let prev = -1;
  for (const n of propAssigns.map(a => a.key).sort((a, b) => a - b)) {
    if (prev < n - 1) return true;
    prev = n;
  }
  return false;
}

/**
 * @param {import('@babel/types')} t
 * @param {FunctionPath} path
 * @param {PropAssign[]} propAssigns
 */
function destructureFunctionArgs(t, path, propAssigns) {
  const bodyScope = path.get('body').scope;
  // collect the params in the form of usable bindings
  /** @type {Binding[]} */
  const params = [];
  for (const p of path.node.params) {
    /** @type {Identifier | null} */
    let node = null;
    if (t.isIdentifier(p)) {
      node = p;
    } else if (t.isAssignmentPattern(p) && t.isIdentifier(p.left)) {
      node = p.left;
    }
    if (node) {
      const binding = bodyScope.getOwnBinding(node.name);
      if (binding) params.push(binding);
    }
  }

  // of the pass-in property assignments, find the ones that reference the
  // function parameters, destructure those, and return all the remaining ones
  let remainingAssigns = propAssigns;
  for (const binding of params) {
    const assigns = propAssigns.filter(a => a.objectBinding === binding);

    // if nothing in the function refers to this, or it's needed non-destructed
    if (!assigns.length || assigns.length < binding.references) continue;

    // if the references are array indices that are too spread out, like
    // [0] [3] [9], don't bother
    if (
      assigns[0].array &&
      sparseIndices(/** @type {ArrayPropAssign[]} */ (assigns))
    )
      continue;

    remainingAssigns = remainingAssigns.filter(a => !assigns.includes(a));
    binding.path.replaceWith(buildDestructure(t, assigns));
    deleteAssigns(assigns);
  }

  return remainingAssigns;
}

/**
 * @param {import('@babel/types')} t
 * @param {ProgramPath | FunctionPath} path
 * @param {PropAssign[]} propAssigns
 */
function destructureOthers(t, path, propAssigns) {
  // group propAssigns by ones which point at the same binding
  // (not just same name) - avoid colliding var names (a.value)
  /** @type {PropAssign[][]} */
  const groups = [];
  for (const a of propAssigns) {
    const group = groups.find(g => {
      const [first] = g;
      return (
        a.objectBinding &&
        first.objectBinding === a.objectBinding && // point at the same thing
        g.every(ga => ga.value !== a.value) && // no repeat bindings
        first.array === a.array && // all [] or {}
        // const !== let
        /** @type {VariableDeclaration} */ (first.path.parent).kind ===
          /** @type {VariableDeclaration} */ (a.path.parent).kind
      );
    });
    if (group) group.push(a);
    else groups.push([a]);
  }

  for (const group of groups) {
    const first = group[0];
    if (first.array) {
      // don't bother with const [x] = foo;
      // don't try to destructure a sparse group, like [0], [3], [9] or [1], [2]
      if (
        group.length === 1 ||
        sparseIndices(/** @type {ArrayPropAssign[]} */ (group))
      )
        continue;
    } else if (
      // don't convert a single: const x = something.y; into
      // const { y: x } = something; unless something is a require
      group.length === 1 &&
      first.key !== first.value &&
      !(
        t.isCallExpression(first.object) &&
        t.isIdentifier(first.object.callee, { name: 'require' })
      )
    )
      continue;

    const destructure = buildDestructure(t, group);

    // if all these propAssigns point at a single binding, and it's a thing
    // being assigned to, just replace its assignment with the destructure
    if (
      first.objectBinding &&
      first.objectBinding.references === group.length &&
      t.isVariableDeclarator(first.objectBinding.path.node) &&
      t.isIdentifier(first.objectBinding.path.node.id)
    ) {
      const id = /** @type {NodePath} */ (first.objectBinding.path.get('id'));
      id.replaceWith(destructure);
    } else {
      first.path.parentPath.insertAfter(
        t.variableDeclaration(
          /** @type {VariableDeclaration} */ (first.path.parent).kind,
          [
            t.variableDeclarator(
              destructure,
              first.objectBinding
                ? t.identifier(first.objectBinding.identifier.name)
                : first.object
            ),
          ]
        )
      );
    }
    deleteAssigns(group);
  }
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
function useDestructuring({ types: t }) {
  return {
    visitor: {
      Program(path) {
        /** @type {PropAssign[]} */
        const propAssigns = [];
        path.traverse({
          Function(subPath) {
            return subPath.stop();
          },
          VariableDeclarator: findPropAssigns.bind(null, propAssigns, t),
        });
        destructureOthers(t, path, propAssigns);
      },
      Function(path) {
        /** @type {PropAssign[]} */
        const propAssigns = [];
        path.traverse({
          VariableDeclarator: findPropAssigns.bind(null, propAssigns, t),
        });
        const otherAssigns = destructureFunctionArgs(t, path, propAssigns);
        destructureOthers(t, path, otherAssigns);
      },
    },
  };
}
module.exports = useDestructuring;

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

const { BabelRunner } = require('../babel-runner');

/**
 * @param {import('@babel/types')} t
 * @param {string} tag
 * @param {import('@babel/types').ObjectExpression} attrsNode
 */
function extractSelector(t, tag, attrsNode) {
  const newProps = [];
  for (const prop of attrsNode.properties) {
    if (t.isObjectProperty(prop) && t.isStringLiteral(prop.value)) {
      const key = t.isIdentifier(prop.key)
        ? prop.key.name
        : t.isStringLiteral(prop.key)
        ? prop.key.value
        : null;
      if (key === 'class' || key === 'className') {
        tag += `.${prop.value.value.split(/\s+/).join('.')}`;
        continue; // remove class prop
      } else if (key === 'id') {
        tag += `#${prop.value.value}`;
        continue; // remove id prop
      }
    }
    newProps.push(prop);
  }

  // strip off superfluous div. or div#
  if (/^div[.#]/.test(tag)) tag = tag.substr(3);

  // with class & id filtered out
  attrsNode.properties = newProps;

  return tag;
}

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function hToPhy({ types: t }) {
  let needsPhy = false;

  return {
    visitor: {
      CallExpression({ node: callExpr }) {
        // we only operate on h() calls
        if (!t.isIdentifier(callExpr.callee, { name: 'h' })) return;

        // we only want to try to "upgrade" vanilla h() calls
        if (callExpr.arguments.length < 2) return;
        const [tagNode, attrsArg, ...kidNodes] = callExpr.arguments;

        // convert <>...</> fragment syntax
        if (t.isIdentifier(tagNode, { name: 'Fragment' })) {
          if (!t.isNullLiteral(attrsArg)) return;
          callExpr.arguments = [
            t.arrayExpression(
              /** @type {Parameters<typeof t.arrayExpression>[0]} */ (kidNodes)
            ),
          ];
          return;
        }

        if (!t.isStringLiteral(tagNode)) return;
        const tag = tagNode.value;

        // if the "tag" is already a selector
        if (/[.#]/.test(tag)) return;

        const attrsNode = t.isNullLiteral(attrsArg)
          ? t.objectExpression([])
          : t.isObjectExpression(attrsArg)
          ? attrsArg
          : null;
        if (!attrsNode) return;

        const selector = extractSelector(t, tag, attrsNode);

        /** @type {typeof callExpr.arguments} */
        const callArgs = [t.stringLiteral(selector)];
        if (attrsNode.properties.length > 0) callArgs.push(attrsNode);

        if (kidNodes.length > 0) {
          callArgs.push(
            kidNodes.length > 1
              ? t.arrayExpression(
                  /** @type {Parameters<typeof t.arrayExpression>[0]} */ (
                    kidNodes
                  )
                )
              : kidNodes[0]
          );
        }

        needsPhy = true;
        callExpr.arguments = callArgs;
      },

      Program: {
        exit(progPath) {
          if (!needsPhy || progPath.scope.hasBinding('h')) return;
          // TODO: also try to pull in Component, Fragment, etc? if they're
          // require'ing preact already?
          progPath.node.body.unshift(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('h'),
                t.callExpression(t.identifier('require'), [
                  t.stringLiteral('phy'),
                ])
              ),
            ])
          );
        },
      },
    },
  };
}

/** @type {import('../transform').Transform} */
const transform = {
  name: 'phy',
  descr: 'Converts boring h() or jsx calls to phy h() calls',
  order: 15,
  async transform(source, inFile) {
    return new BabelRunner(source, inFile).run({
      plugins: [
        [
          '@babel/plugin-transform-react-jsx',
          { pragma: 'h', pragmaFrag: 'Fragment' },
        ],
        hToPhy,
      ],
    });
  },
};
module.exports = transform;

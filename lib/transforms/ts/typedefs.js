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
const debug = require('debug')('transform:ts:typedefs');

const { parseTSTypeString, COMMENT_TYPES } = require('./common');

const TYPEDEF_OBJ_BLOCK_RE =
  /\n\s*\*\s*@typedef\s+(?<objName>\w+)\s*\n(?<propLines>(?:[^\S\n]*\*\s*@property\b.+\n)+)/g;
const TYPEDEF_ALIAS_RE =
  /@typedef\s*\{(?<type>[\s\S]+?)\}\s*(?<alias>\w+)\s*(?:\n|$)/g;
/**
 * @returns {{ visitor: babel.Visitor }}
 */
function convertTypedefs() {
  /** @type {babel.types.Statement[]} */
  const stmts = [];
  return {
    visitor: {
      Program: {
        enter(progPath) {
          stmts.splice(0);

          /** @type {Set<babel.types.Comment>} */
          const seen = new Set();

          progPath.traverse({
            enter(p) {
              for (const commSet of COMMENT_TYPES) {
                if (!p.node[commSet]) continue;
                for (const comment of p.node[commSet] || []) {
                  if (comment.type !== 'CommentBlock') continue;

                  // don't double-process, since they exist in leading & trailing
                  if (seen.has(comment)) continue;
                  seen.add(comment);

                  comment.value = comment.value
                    .replace(
                      TYPEDEF_OBJ_BLOCK_RE,
                      handleTypedefObjBlock.bind(null, stmts)
                    )
                    .replace(
                      TYPEDEF_ALIAS_RE,
                      handleTypedefAlias.bind(null, stmts)
                    );
                }
              }
            },
          });
        },

        exit(progPath) {
          progPath.node.body.unshift(...stmts);
        },
      },
    },
  };
}
exports.convertTypedefs = convertTypedefs;

/**
 * @param {babel.types.Statement[]} stmts
 * @param {string} m
 * @param {string} objName
 * @param {string} propLines
 */
function handleTypedefObjBlock(stmts, m, objName, propLines) {
  stmts.push(
    t.exportNamedDeclaration(
      t.tsInterfaceDeclaration(
        t.identifier(objName),
        null,
        null,
        t.tsInterfaceBody(propLines.trim().split('\n').map(propLineToTypeElem))
      ),
      []
    )
  );
  return '';
}

const OBJ_PROP_LINE_RE =
  /^\s*\*\s*@property\s*\{(?<type>.*[^=])(?<opt1>=?)\}\s*(?<opt2>(?:\[\s*)?)(?<prop>\w+)/;
/**
 * @param {string} line
 */
function propLineToTypeElem(line) {
  const m = line.match(OBJ_PROP_LINE_RE);
  if (!m) throw new Error(`Couldn't match prop in ${line}`);
  const { type, opt1, opt2, prop } = m.groups || {};
  const typeAnn = parseTSTypeString(type);
  return Object.assign(
    t.tsPropertySignature(t.identifier(prop), t.tsTypeAnnotation(typeAnn)),
    { optional: !!opt1 || !!opt2 }
  );
}

const IMPORT_ALIAS_RE =
  /^\s*import\s*\(\s*['"](?<mod>[^'"]+)['"]\s*\)(?:\.(?<key>\w+))?\s*$/;
/**
 * @param {babel.types.Statement[]} stmts
 * @param {string} m
 * @param {string} type
 * @param {string} alias
 */
function handleTypedefAlias(stmts, m, type, alias) {
  // special case {import('./foo').Something} stuff
  const importMatch = type.match(IMPORT_ALIAS_RE);
  if (importMatch) {
    const { mod, key } = importMatch.groups || {};
    debug('Found type import:', { type, alias, mod, key });
    stmts.unshift(
      t.importDeclaration(
        [
          key
            ? t.importSpecifier(t.identifier(alias), t.identifier(key))
            : t.importDefaultSpecifier(t.identifier(alias)),
        ],
        t.stringLiteral(mod)
      )
    );
  } else {
    debug('Found typedef alias:', { type, alias });
    stmts.push(
      t.exportNamedDeclaration(
        t.tsTypeAliasDeclaration(
          t.identifier(alias),
          null,
          parseTSTypeString(type)
        ),
        []
      )
    );
  }

  return '';
}

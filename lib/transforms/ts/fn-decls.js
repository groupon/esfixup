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
const debug = require('debug')('transform:ts:fn-decls');

const { parseTSTypeString } = require('./common');

const FN_PARAM_RE =
  /@param\s*\{(?<type>.*[^=])(?<opt1>=?)\}\s*(?<opt2>(?:\[\s*)?)[\w$].*/g;
const FN_RETURN_RE = /@returns?\s*\{(?<returnType>.+)\}/;
/**
 * @returns {{ visitor: babel.Visitor }}
 */
function typeFnDecls() {
  return {
    visitor: {
      Function: {
        exit(path) {
          if (!path.node.leadingComments) return;
          const lastComment = path.node.leadingComments.slice(-1)[0];
          if (lastComment.type !== 'CommentBlock') return;
          const fnParams = [...path.node.params];
          lastComment.value = lastComment.value
            .replace(FN_PARAM_RE, handleFnParam.bind(null, fnParams))
            .replace(FN_RETURN_RE, handleFnReturn.bind(null, path.node));
        },
      },
    },
  };
}
exports.typeFnDecls = typeFnDecls;

/**
 * @param {babel.types.Function} fn
 * @param {string} m
 * @param {string} returnType
 */
function handleFnReturn(fn, m, returnType) {
  fn.returnType = t.tsTypeAnnotation(parseTSTypeString(returnType));
  return '';
}

/**
 * @param {(t.Identifier | t.RestElement | t.TSParameterProperty | t.Pattern)[]} fnParams
 * @param {string} m
 * @param {string} type
 * @param {string} opt1
 * @param {string} opt2
 */
function handleFnParam(fnParams, m, type, opt1, opt2) {
  debug('handleFnDecl', { type, opt1, opt2 });
  const fnParam = fnParams.shift();
  const typeAnn = t.tsTypeAnnotation(parseTSTypeString(type));
  if (fnParam) {
    if (t.isAssignmentPattern(fnParam)) {
      if (
        !t.isMemberExpression(fnParam.left) &&
        !t.isTSNonNullExpression(fnParam.left)
      ) {
        fnParam.left.typeAnnotation = typeAnn;
      }
    } else {
      if (!t.isTSParameterProperty(fnParam)) {
        fnParam.typeAnnotation = typeAnn;
        if (t.isIdentifier(fnParam)) fnParam.optional = !!opt1 || !!opt2;
      }
    }
  } else {
    debug('params length mismatch');
  }
  return '';
}

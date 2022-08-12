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
 * @tutorial https://youmightnotneed.com/lodash/#concat
 */

// _.concat(expr0) -> expr0
// _.concat(expr0, expr1) -> expr0.concat(exp1)
// _.concat(expr0, expr1, [expr2]) -> expr0.concat(exp3, [expr2])

const isLodashCall = require('./is-lodash-call');

/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
function concat({ types: t }) {
  return {
    visitor: {
      CallExpression(callPath) {
        if (!isLodashCall(t, 'concat', callPath)) return;

        const args = callPath.node.arguments;

        const args0 = args.shift();
        if (!t.isExpression(args0)) return;

        // replace exp0.concat()
        if (args.length === 0) {
          callPath.replaceWith(args0);
          return;
        }

        // replace entire concat(expr0, expr1) call with expr0.concat(expr1)
        callPath.replaceWith(
          t.callExpression(
            t.memberExpression(args0, t.identifier('concat')),
            args
          )
        );
      },
    },
  };
}
module.exports = concat;

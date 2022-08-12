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

const { BabelRunner } = require('../../babel-runner');

const pass1Plugins = [require('./parse-requires')];

const pass2Plugins = [
  require('./expect'),
  require('./truthy'),
  require('./equal'),
  require('./not-match'),
  require('./include'),
  require('./throws'),
  require('./rejects'),
];

const removeUnusedRequires = require('../../remove-requires');
const pass3Plugins = [
  require('./cleanup-requires'),
  removeUnusedRequires.bind(null, 'assertive'),
];

/*
Pass 1:
  * determine how assertive and/or assert are currently required
  * normalize any assertive require to const assertive = require('assertive');
  
Pass 2:
  * replace all known methods with assert.* equivalents (transforms)

Pass 3:
  * add a const assert = require('assert') iff needed
  * remove require('assertive') iff is no longer in use

Transforms:

assertive.*                           => assert.*
--------------------------------------------------------------------------------
expect([msg, ]bool)                   => strictEqual(bool, true[, msg])
truthy([msg, ]bool)                   => ok(bool[, msg])
falsey([msg, ]bool)                   => ok(!bool[, msg])
[not][deep]equal([msg, ]exp, act)     => [not][deep]strictEqual(act, exp[, msg])
match([msg, ]regexp, string)          => match(string, regexp[, msg])
notMatch([msg, ]regexp, string)       => ok(!regexp.test(string)[, msg])
[not]include([msg, ]needle, haystack) => ok([!]haystack.includes(needle)[, msg])
include([msg, ]'needle.', haystack)   => match(haystack, /needle\./[, msg])
               \_ note specifically for literal strings
throws([msg, ]fnThatThrows)           => throws(fnThatThrows[, msg])
notThrows([msg, ]fnThatThrows)        => doesNotThrow(fnThatThrows[, msg])
resolves([msg, ]promise)              => doesNotReject(promise[, msg])
\_ iff is returned out of it() or awaited & unused
rejects([msg, ]promise)               => rejects(promise[, msg])
\_ iff is returned out of it() or awaited & unused

TODO: convert ok(regexp.test(string][, msg]) to match(string, regexp[, msg])
*/

/**
 * @typedef {import('@babel/types').ObjectPattern} ObjectPattern
 *
 * @typedef AssertState
 * @property {true | Record<string, string>} [assert] How assert is remapped (if is)
 * @property {true | Record<string, string>} [assertive] How assertive is required/remapped
 * @property {true} [dirty] Whether we've done any transforms
 */

/** @type {import('../../transform').Transform} */
const assertiveToAssert = {
  name: 'assert',
  descr: 'Converts uses of assertive to assert',
  order: 26,

  async transform(js, inFile) {
    /** @type {AssertState} */
    const state = {};
    /** @type {import('@babel/core').TransformOptions[]} */

    return BabelRunner.runAllPasses(js, inFile, [
      { plugins: pass1Plugins.map(p => [p, state]) },
      { plugins: pass2Plugins.map(p => [p, state]) },
      { plugins: pass3Plugins.map(p => [p, state]) },
    ]);
  },
};
module.exports = assertiveToAssert;

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

const semver = require('semver');

const { BabelRunner } = require('../../babel-runner');
const objectAssignToSpread = require('./transforms/object-spread');
const coroutineToAsyncAwait = require('./transforms/async-await');
const useDestructuring = require('./transforms/destructuring');
const unusedErr = require('./transforms/unused-err');
const globalURL = require('./transforms/global-url');
const indexOfToIncludes = require('./transforms/indexof-to-includes');
const arrayFlat = require('./transforms/array-flat');
const optionalChaining = require('./transforms/optional-chaining');
const deGuard = require('./transforms/de-guard');

const pass1Plugins = [objectAssignToSpread, coroutineToAsyncAwait, deGuard];
const pass2BasePlugins = [useDestructuring, indexOfToIncludes];
const pass2Node10Plugins = [unusedErr, globalURL];
const pass2Node12Plugins = [arrayFlat];
const pass2Node14Plugins = [optionalChaining];

/** @type {import('../../transform').Transform} */
const jsTransform = {
  name: 'js',
  descr: 'Upgrades JS/ES Syntax',
  order: 30,

  async transform(js, inFile, outFile, nodeVersion) {
    const pass2Plugins = [...pass2BasePlugins];
    if (semver.gte(nodeVersion, '10.0.0'))
      pass2Plugins.push(...pass2Node10Plugins);
    if (semver.gte(nodeVersion, '12.0.0'))
      pass2Plugins.push(...pass2Node12Plugins);
    if (semver.gte(nodeVersion, '14.0.0'))
      pass2Plugins.push(...pass2Node14Plugins);

    return BabelRunner.runAllPasses(js, inFile, [
      { plugins: pass1Plugins },
      { plugins: pass2Plugins },
    ]);
  },
};
module.exports = jsTransform;

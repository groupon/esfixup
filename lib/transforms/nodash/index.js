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

const removeRequires = require('../../remove-requires');

const arrayPlugins = [
  require('./compact'),
  require('./concat'),
  require('./difference'),
  require('./drop_dropRight'),
  require('./fill'),
  require('./head_first'),
  require('./initial'),
  require('./intersection'),
  require('./join'),
  require('./last'),
  require('./take_takeRight'),
  require('./toPairs'),
  require('./without'),
  require('./uniq'),
  require('./union'),
  require('./unzip'),
  require('./zip'),
  require('./zipObject'),
];
const objectPlugins = [
  require('./assign'),
  require('./keys'),
  require('./values'),
];
const pass1Node12Plugins = [require('./flatten'), require('./fromPairs')];

const lodashPlugins = [...arrayPlugins, ...objectPlugins];

/** @type {import('../../transform').Transform} */
module.exports = {
  name: 'nodash',
  descr: 'Removes unnecessary lodash usage',
  order: 25,

  async transform(js, inFile, outFile, nodeVersion) {
    const pass1Plugins = [...lodashPlugins];
    if (semver.gte(nodeVersion, '12.0.0')) {
      pass1Plugins.push(...pass1Node12Plugins);
    }

    const passes = [
      { plugins: pass1Plugins },
      { plugins: [removeRequires.bind(null, /^lodash(?:[./]\w+)?$/)] },
    ].filter(Boolean);

    const runner = new BabelRunner(js, inFile);
    for (const pass of passes) await runner.run(pass);
    return runner.code;
  },
};

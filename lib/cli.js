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

const fs = require('fs');

const prog = require('commander');
const semver = require('semver');
const debug = require('debug')('transform:cli');
const pkgUp = require('pkg-up');

const { version } = require('../package.json');
const { loadTransforms, runTransforms } = require('./transform');

let defNodeVersion = '8.3.0';
try {
  const pjPath = pkgUp.sync();
  if (!pjPath) throw new Error("Couldn't find a package.json file");
  debug('Looking for engines in:', pjPath);
  const { engines } = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
  if (engines && engines.node) defNodeVersion = engines.node;
} catch (err) {
  debug("couldn't resolve engines.node", err);
}

const allTransforms = loadTransforms();
// @ts-ignore
const allTransformNames = allTransforms.map(t => t.name);

prog
  .version(version)
  .usage('file-or-dir [...]')
  .option(
    '-t, --transforms <transforms>',
    `(required) list of transforms to perform; avail: ${allTransformNames}`
  )
  .option('-F, --no-lint-fix', "don't run eslint --fix on results")
  .option('--node-version <x.y.z>', 'node version to target', defNodeVersion)
  .parse(process.argv);

/** @type {string} */
const transformNames = prog.transforms;
/** @type {boolean} */
const lintFix = prog.lintFix;
/** @type {string[]} */
const filesOrDirs = prog.args;

const nodeVerSemver = semver.coerce(prog.nodeVersion);
if (!nodeVerSemver) {
  throw new Error(`failed to parse --node-version: ${prog.nodeVersion}`);
}
const nodeVersion = nodeVerSemver.version;
debug('using nodeVersion', nodeVersion);

if (!transformNames || filesOrDirs.length === 0) prog.help();

const transforms = transformNames.split(/,/).map(name => {
  // @ts-ignore
  const transform = allTransforms.find(t => t.name === name);
  if (!transform) throw new Error(`invalid transform name: ${name}`);
  return transform;
});

/**
 * @param {string} transformName
 * @param {string} message
 */
function logger(transformName, message) {
  // eslint-disable-next-line no-console
  console.log(`[${transformName}] ${message}`);
}

runTransforms(filesOrDirs, { transforms, lintFix, nodeVersion, logger }).catch(
  err => {
    process.nextTick(() => {
      throw err;
    });
  }
);

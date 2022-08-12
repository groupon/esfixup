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
const cp = require('child_process');
const { promisify } = require('util');
const { basename } = require('path');

const debug = require('debug')('transform');
const globby = require('globby');
const chalk = require('chalk');

const { readdirSync, existsSync } = fs;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const execFile = promisify(cp.execFile);

const fixBrokenEslintComments = require('./broken-eslint-comments');

function noopLogger() {}

/**
 * @typedef Transform
 * @property {string} name
 * @property {string} [descr]
 * @property {number} order
 * @property {string} [inExt]
 * @property {string} [outExt]
 * @property {string} [fileName]
 * @property {(
 *   content: string,
 *   inFile: string,
 *   outFile: string,
 *   nodeVersion: string
 * ) => Promise<string | null>} transform
 *
 * @typedef RunOpts
 * @property {boolean} [lintFix]
 * @property {Transform[]} [transforms]
 * @property {string} nodeVersion
 * @property {(transformName: string, message: string) => void} [logger]
 */

function loadTransforms() {
  const transformsDir = `${__dirname}/transforms`;
  return readdirSync(transformsDir).reduce((modules, name) => {
    /** @type {Transform} */
    // eslint-disable-next-line import/no-dynamic-require
    const module = require(`${transformsDir}/${name}`);
    if (module.name) modules.push(module);
    return modules;
  }, /** @type {Transform[]} */ ([]));
}
exports.loadTransforms = loadTransforms;

/**
 * @param {string[]} filesOrDirs
 * @param {string} [ext]
 * @param {string} [fileName]
 */
async function expandFilesOrDirs(filesOrDirs, ext = 'js', fileName = '*') {
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const dirs = [];
  for (const fileOrDir of filesOrDirs) {
    ((await stat(fileOrDir)).isDirectory() ? dirs : files).push(fileOrDir);
  }
  return [
    ...files,
    ...(await globby(
      dirs.map(d => `${d}/**/${fileName}.${ext}`),
      { gitignore: true }
    )),
  ];
}

/**
 * @param {string} file
 * @param {string} extOut
 */
function replaceExt(file, extOut) {
  return file.replace(/[^.]+$/, extOut);
}

/**
 * @param {string[]} filesOrDirs
 * @param {RunOpts} opts
 */
async function runTransforms(
  filesOrDirs,
  { transforms, lintFix, nodeVersion = '8.3.0', logger = noopLogger }
) {
  if (!transforms) transforms = loadTransforms();
  transforms.sort((a, b) => a.order - b.order);

  if (lintFix == null) {
    lintFix = existsSync('.eslintrc.json') || existsSync('.eslintrc');
  }

  let files = await expandFilesOrDirs(
    filesOrDirs,
    transforms[0].inExt,
    transforms[0].fileName
  );

  for (const { inExt = 'js', outExt = 'js', transform, name } of transforms) {
    debug('running transform %s', name);
    /** @type {string[]} */
    const dirtyFiles = [];
    for (const inFile of files) {
      const outFile = replaceExt(inFile, outExt);
      const content = await readFile(inFile, 'utf8');
      /** @type {string | null} */
      let result;
      try {
        result = await transform(content, inFile, outFile, nodeVersion);
      } catch (/** @type {any} */ err) {
        // eslint-disable-next-line no-console
        console.error(
          `${chalk.red(`Error applying transform [${name}] to ${inFile}:`)}\n${(
            err.stack || ''
          ).replace(/^/gm, '    ')}`
        );
        process.exitCode = 1;
        continue;
      }
      if (result == null) {
        logger(name, `🆗 ${chalk.gray(inFile)}`);
        continue;
      } else {
        if (inFile === outFile) logger(name, `✏️  ${inFile}`);
        else logger(name, `✏️  ${inFile} → ${basename(outFile)}`);
        await writeFile(outFile, result);
        dirtyFiles.push(outFile);
        if (outExt !== inExt) {
          await unlink(inFile);
        }
      }
    }

    if (inExt !== outExt) files = files.map(f => replaceExt(f, outExt));

    const isESLintable = outExt === 'js' || outExt === 'ts';

    if (isESLintable && dirtyFiles.length > 0) {
      for (const filePath of dirtyFiles) {
        const content = await readFile(filePath, 'utf8');
        const fixed = fixBrokenEslintComments(content);
        if (fixed !== content) {
          await writeFile(filePath, fixed);
          debug('fixed broken eslint contents in', filePath);
        }
      }
    }

    if (lintFix && isESLintable && dirtyFiles.length > 0) {
      debug('lint fixing');
      // for some reason CLIEngine just doesn't work right
      // remove DEBUG from process.env to avoid blowing the output limits
      // on execFile()
      const { DEBUG, ...env } = process.env;
      await execFile('npx', ['eslint', '--quiet', '--fix', ...dirtyFiles], {
        env,
      }).catch(err => {
        debug('eslint failed:', err);
      });
    }
  }
}
exports.runTransforms = runTransforms;

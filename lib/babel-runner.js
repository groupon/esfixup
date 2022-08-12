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

// class to aid in running babel repeatedly on the same source

const babel = require('@babel/core');
const parser = require('@babel/parser');
const t = require('@babel/types');

/**
 * @typedef {import('@babel/core').TransformOptions} TransformOptions
 * @typedef {import('@babel/core').BabelFileResult} BabelFileResult
 * @typedef {import('@babel/types').Program} Program
 */

class BabelRunner {
  /**
   * @param {string} initSource
   * @param {string} sourceFilename
   */
  constructor(initSource, sourceFilename) {
    /** @type {string} */
    this.code = initSource;
    /** @type {string} */
    this.filename = sourceFilename;
    /** @type {Program | null} */
    this.ast = null;
  }

  /**
   * @param {string} initSource
   * @param {string} sourceFilename
   * @param {TransformOptions[]} passes
   * @returns {Promise<string | null>}
   */
  static async runAllPasses(initSource, sourceFilename, passes) {
    const runner = new BabelRunner(initSource, sourceFilename);
    const origAST = runner.getAST();
    for (const pass of passes) await runner.run(pass);
    const finalAST = runner.getAST();
    return t.isNodesEquivalent(origAST, finalAST) ? null : runner.code;
  }

  defaultOptions() {
    return {
      babelrc: false,
      configFile: /** @type {false} */ (false),
      filename: this.filename,
      sourceType: /** @type {'script'} */ ('script'),
      ast: true,
    };
  }

  getAST() {
    if (!this.ast) {
      this.ast = parser.parse(this.code, this.defaultOptions()).program;
    }
    return this.ast;
  }

  /** @param {TransformOptions} options */
  async run(options) {
    /** @type {BabelFileResult | null} */
    let res;
    if (this.ast) {
      res = await babel.transformFromAstAsync(this.ast, this.code, {
        ...this.defaultOptions(),
        ...options,
      });
    } else {
      res = await babel.transformAsync(this.code, {
        ...this.defaultOptions(),
        ...options,
      });
    }
    if (!res) throw new Error('no result?');
    if (!res.code) throw new Error('no code?');
    if (!res.ast) throw new Error('no ast?');
    this.code = res.code.replace(/([^\n])$/, '$1\n');
    this.ast = res.ast.program;
    return res.code;
  }
}
exports.BabelRunner = BabelRunner;

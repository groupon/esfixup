'use strict';

const tempy = require('tempy');

/* eslint-env mocha */

const cwd = process.cwd();

function inTmpDir() {
  beforeEach(() => {
    process.chdir(tempy.directory());
  });

  afterEach(() => {
    process.chdir(cwd);
  });
}
module.exports = inTmpDir;

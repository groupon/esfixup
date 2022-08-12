'use strict';

const { CLIEngine } = require('eslint');

const eslintCLI = new CLIEngine({
  configFile: `${__dirname}/../.eslintrc.json`,
  fix: true,
  useEslintrc: false,
});

function lintFix(source, file) {
  const res = eslintCLI.executeOnText(source, file).results[0];
  if (res.source) return res.source;
  throw new Error(
    `lintFix() failed:\n${res.messages
      .map(m => m.message)
      .join('\n')}\n${source}`
  );
}
module.exports = lintFix;

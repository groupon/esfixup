'use strict';

const assert = require('assert');

const fixBrokenEslintComments = require('../lib/broken-eslint-comments');

describe('fixBrokenEslintComments()', () => {
  it('repairs broken bits', () => {
    const jsBefore = `
      if (blah) return; // eslint-disable-next-line no-console

      console.log('wtf');
    `;

    const jsAfter = `
      if (blah) return;

// eslint-disable-next-line no-console
      console.log('wtf');
    `;

    assert.strictEqual(fixBrokenEslintComments(jsBefore), jsAfter);
  });

  it('leaves other bits alone', () => {
    const jsBefore = `
      // eslint-disable-next-line no-console
      console.log('yay');
    `;

    assert.strictEqual(fixBrokenEslintComments(jsBefore), jsBefore);
  });
});

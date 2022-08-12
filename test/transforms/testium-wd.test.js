'use strict';

const assert = require('assert');
const normWS = require('./normalize-whitespace');
const testiumWD = require('../../lib/transforms/testium-wd');

const TEST_CASES = {
  'testium-wd: no-op for existing wd code': [
    `const injectBrowser = require('testium-mocha');
    describe('x', () => {
      before(injectBrowser({ driver: 'wd' }));
      it('tests stuff', function () {
        return this.loadPage('/');
      });
    });`,
  ],

  'testium-wd: no-op for non-testium code': [
    `browser.navigateTo();`,

    `browser.navigateTo();`,
  ],

  'testium-wd: handles code already using beforeHook': [
    `const { browser } = require('testium-mocha');
    describe('x', () => {
      before(browser.beforeHook());
      it('y', () => {
        browser.navigateTo('/');
      });
    });`,

    `const { browser } = require('testium-mocha');
    describe('x', () => {
      before(browser.beforeHook({ driver: "wd" }));
      it('y', () => browser.loadPage('/'));
    });`,
  ],

  'testium-wd: converts from testium-sync semantics': [
    `const injectBrowser = require('testium/mocha');
    describe('x', () => {
      before(injectBrowser({ driver: 'sync' }));
      it('y', function () {
        this.browser.navigateTo('/');
        return this.browser.waitForElementVisible('#a');
      });
      it('checks', () => {
        browser.assert.httpStatus(204);
      });
      it('z', () => {
        browser.navigateTo('/z');
        assert.equal(200, browser.getStatusCode());
        browser.assert.elementIsVisible('#a');
        browser.assert.elementExists('#a');
        assert.expect(true);
        browser.setCookie({ domain: 'd' });
        browser.setCookie({ name: 'a', value: 'b' });
        browser.setCookies([{ name: 'a', value: 'b' }, { path: '/x' }]);
        browser.setCookies([
          { name: 'a', value: 'b' },
          { name: 'c d', path: '/', value: 'e' },
        ]);
        const e = browser.getElement('#e');
        assert.equal(42, e.get('num'));
        const f = browser.assert.elementIsVisible('#f');
        f.movePointerRelativeTo(0, 0);
      });
      it('q', (dun) => {
        browser.navigateTo('/q');
        assert.equal('is equal', 500, browser.getStatusCode());
        browser.doSomething();
        setTimeout(dun, 1000);
      });
    });`,

    `const { browser } = require("testium-mocha");
    describe('x', () => {
      before(browser.beforeHook({ driver: "wd" }));
      it('y', () =>
        browser.loadPage('/', { expectedStatusCode: 204 }).waitForElementDisplayed('#a'));
      it('z', async () => {
        await browser.loadPage('/z').assertElementIsDisplayed('#a').assertElementExists('#a');
        assert.expect(true);
        await browser.setCookie({ domain: 'd' }).setCookieValue('a', 'b').setCookies([{ name: 'a', value: 'b' }, { path: '/x' }]).setCookieValues({ a: 'b', 'c d': 'e' });
        const e = await browser.getElement('#e');
        assert.equal(42, await e.get('num'));
        const f = await browser.assertElementIsDisplayed('#f');
        await f.moveTo(0, 0);
      });
      it('q', async dun => {
        throw new Error("Can't autoconvert mocha with dun callback");
        await browser.loadPage('/q', { expectedStatusCode: 500 }).doSomething();
        setTimeout(dun, 1000);
      });
    });`,
  ],
};
for (const code of Object.values(TEST_CASES)) {
  if (!code[1]) code[1] = code[0];
}

describe('transforms/testium-wd', () => {
  Object.keys(TEST_CASES).forEach(desc => {
    const codes = TEST_CASES[desc];
    it(desc, async () => {
      const result = await testiumWD.transform(
        codes[0],
        `${desc}.js`,
        `${desc}.js`,
        '8.3.0'
      );
      assert.strictEqual(normWS(result), normWS(codes[1]));
    });
  });
});

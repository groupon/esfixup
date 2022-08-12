export type TestiumMethod = import('./common').TestiumMethod;
export type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;
export type Node = import('@babel/traverse').Node;
export type ExpressionStatement = import('@babel/types').ExpressionStatement;
export type NodePath = import('@babel/traverse').NodePath<Node>;
export type ExpressionStatementPath = import('@babel/traverse').NodePath<ExpressionStatement>;
export type MemberExpression = import('@babel/types').MemberExpression;
export type Expression = import('@babel/types').Expression;
export type NumericLiteral = import('@babel/types').NumericLiteral;
export type Statement = import('@babel/types').Statement;
/**
 * special-case handler before general method tranformers:
 * finds uses of browser.navigateTo(), then looks for an optional later sibling
 * that does browser.assert.httpStatus(n) and combines the two into a
 * `loadPage()` call
 * TODO: also find calls to `assert.equal([msg, ]n, browser.getStatusCode())`,
 * which people do a lot
 * TODO: also find either type of assertion in later it() calls, and just
 * nuke the it() call
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 */
export function navigateAndStatusToLoadPage(t: typeof babel.types, path: CallExpressionPath): boolean;
/**
 * TODO: note docString methods and strip docStrings
 * TODO: detect element-returning-methods and track element bindings for
 * converting (and await-ing) Element method calls
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} path
 * @param {string[]} elemVars
 */
export function convertToWDMethod(t: typeof babel.types, path: CallExpressionPath, elemVars: string[]): void;

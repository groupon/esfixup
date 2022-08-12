export type T = typeof babel.types;
export type Expression = import('@babel/types').Expression;
export type Statement = import('@babel/types').Statement;
export type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;
/**
 * @typedef {import('@babel/types')} T
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').Statement} Statement
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 */
/**
 * The default generateUid() functions start with a leading underscore; let's
 * try some nice generic names first
 *
 * @param {import('@babel/traverse').NodePath} callPath
 * @param {string[]} [skip]
 */
export function generateUid(callPath: import('@babel/traverse').NodePath, skip?: string[] | undefined): string;
/**
 * @param {import('@babel/types')} t
 * @param {any} obj
 * @return {boolean}
 */
export function isNotExpression(t: typeof babel.types, obj: any): boolean;
/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {any} obj
 * @return {Expression|undefined}
 */
export function getOwnBindingExpression(t: typeof babel.types, callPath: CallExpressionPath, obj: any): Expression | undefined;
/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {any} number
 * @return {boolean}
 */
export function isValidNumberArg(t: typeof babel.types, callPath: CallExpressionPath, number: any): boolean;
/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath} callPath
 * @param {any} obj
 * @param {function} assertion
 * @return {boolean}
 */
export function isBindingExpression(t: typeof babel.types, callPath: CallExpressionPath, obj: any, assertion: Function): boolean;

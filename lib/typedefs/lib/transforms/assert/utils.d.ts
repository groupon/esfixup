export type BabelTypes = typeof babel.types;
export type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;
export type AssertState = import('.').AssertState;
export type Expression = babel.types.Expression;
/**
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('.').AssertState} AssertState
 * @typedef {babel.types.Expression} Expression
 */
/**
 * NOTE: this also replaces a destructured <fn> with assertive.<originalFn>
 *
 * @param {string} name
 * @param {BabelTypes} t
 * @param {AssertState} state
 * @param {CallExpressionPath} path
 */
export function isAssertiveCall(name: string, t: BabelTypes, state: AssertState, path: CallExpressionPath): boolean;
/**
 * turns callee of call expression into destructured or regular assert call
 * if it can, return array of args with msg reordered to the end
 * if it can't, return null
 *
 * @param {string} name
 * @param {number} numArgs
 * @param {BabelTypes} t
 * @param {AssertState} state
 * @param {CallExpressionPath} path
 * @returns {Expression[] | null}
 */
export function fixAssertCall(name: string, numArgs: number, t: BabelTypes, state: AssertState, path: CallExpressionPath): Expression[] | null;

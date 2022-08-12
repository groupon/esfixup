export type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;
export type ExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').Expression>;
export type MemberExpression = import('@babel/types').MemberExpression;
/**
 *
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath[][]} chains
 * @param {string[]} elemVars
 * @param {CallExpressionPath} path
 */
export function findCallChains(t: typeof babel.types, chains: CallExpressionPath[][], elemVars: string[], path: CallExpressionPath): undefined;
/**
 * @param {import('@babel/types')} t
 * @param {CallExpressionPath[][]} chains
 */
export function buildAwaitCallChains(t: typeof babel.types, chains: CallExpressionPath[][]): void;

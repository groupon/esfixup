export type Binding = import('@babel/traverse').Binding;
export type ProgramPath = import('@babel/traverse').NodePath<import('@babel/types').Program>;
export type ThisExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').ThisExpression>;
export type ReturnStatementPath = import('@babel/traverse').NodePath<import('@babel/types').ReturnStatement>;
export type NodePath = import('@babel/traverse').NodePath<import('@babel/traverse').Node>;
/**
 *
 * @param {import('@babel/core').types} t
 * @param {import('@babel/core').NodePath} progPath
 */
export function alreadyDone(t: typeof babel.types, progPath: import('@babel/core').NodePath): boolean;
/**
 * @param {import('@babel/types')} t
 * @param {ProgramPath} progPath
 * @param {boolean} defWD
 */
export function injectBrowserToBeforeHook(t: typeof babel.types, progPath: ProgramPath, defWD: boolean): boolean;
/**
 * @param {import('@babel/types')} t
 * @param {ThisExpressionPath} path
 */
export function nukeThisDotBrowser(t: typeof babel.types, path: ThisExpressionPath): void;
/**
 *
 * the decaf transformer leaves some occasional code with a `return` on the
 * last expression, which breaks our cleanup - since we know that this code
 * is sync-driver code, its return values are always irrelevant, so we can
 * kill them
 *
 * @param {import('@babel/types')} t
 * @param {ReturnStatementPath} path
 */
export function removeSpuriousReturns(t: typeof babel.types, path: ReturnStatementPath): void;

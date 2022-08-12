export type CallExpression = import('@babel/types').CallExpression;
export type Expression = import('@babel/types').Expression;
export type SpreadElement = import('@babel/types').SpreadElement;
export type ArgumentPlaceholder = import('@babel/types').ArgumentPlaceholder;
export type JSXNamespacedName = import('@babel/types').JSXNamespacedName;
export type ObjectProperty = import('@babel/types').ObjectProperty;
export type ObjectMethod = import('@babel/types').ObjectMethod;
export type Identifier = import('@babel/types').Identifier;
export type StringLiteral = import('@babel/types').StringLiteral;
export type NumericLiteral = import('@babel/types').NumericLiteral;
export type MemberExpression = import('@babel/types').MemberExpression;
export type NodePath = import('@babel/traverse').NodePath<import('@babel/traverse').Node>;
export type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;
export type TestiumMethod = {
    returnsElement?: boolean | undefined;
    wdName?: string | undefined;
    assert?: boolean | undefined;
    element?: boolean | undefined;
    convert?: ((t: typeof import('@babel/types'), path: CallExpressionPath, oldName?: string, method?: TestiumMethod) => void) | undefined;
};
/** @type {Record<string, TestiumMethod>} */
export const testiumMethods: Record<string, TestiumMethod>;
/**
 * validates that a call looks like browser.x() or browser.assert.x(),
 * or someElement.x() and to validate takes
 *
 * @param {import('@babel/types')} t
 * @param {CallExpression} callExpr
 * @param {{ assert?: boolean, element?: string[], name?: string }} [opts]
 */
export function isSyncBrowserMethod(t: typeof babel.types, { callee: c }: CallExpression, opts?: {
    assert?: boolean | undefined;
    element?: string[] | undefined;
    name?: string | undefined;
} | undefined): boolean | undefined;
/**
 * might be a call chain already, so need to go up the tree to find `browser`
 *
 * @param {import('@babel/types')} t
 * @param {CallExpression} callExpr
 * @param {string[]} elemVars
 */
export function isAsyncBrowserMethod(t: typeof babel.types, { callee: c }: CallExpression, elemVars: string[]): boolean;
/**
 * @param {import('@babel/types')} t
 * @param {NodePath} path
 */
export function isMochaCall(t: typeof babel.types, path: NodePath): boolean;
/**
 * in a couple of places we need to know which are the sort of mocha functions
 * that can take a callback or expect a returned promise (e.g. not `describe()`)
 *
 * @param {import('@babel/types')} t
 * @param {NodePath} path
 */
export function isMochaAction(t: typeof babel.types, { parentPath: pPath }: NodePath): boolean | null;
/**
 * @param {import('@babel/types')} t
 * @param {string} keyStr
 * @param {Expression | string} valOrStr
 * @param {(Expression | SpreadElement | ArgumentPlaceholder | JSXNamespacedName)[]} args
 * @param {number} [pos]
 */
export function ensurePropertyValue(t: typeof babel.types, keyStr: string, valOrStr: Expression | string, args: (Expression | SpreadElement | ArgumentPlaceholder | JSXNamespacedName)[], pos?: number | undefined): boolean | null;

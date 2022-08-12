export = isLodashCall;
/**
 * @param {import('@babel/types')} t
 * @param {string|string[]} namesAndAliases
 * @param {import('@babel/core').NodePath<import('@babel/types').CallExpression>} path
 */
declare function isLodashCall(t: typeof babel.types, namesAndAliases: string | string[], path: import('@babel/core').NodePath<import('@babel/types').CallExpression>): boolean;

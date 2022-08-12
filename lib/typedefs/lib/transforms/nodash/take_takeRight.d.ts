export = take_takeRight;
/**
 * @typedef {import('@babel/types')} T
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').ArrayExpression} ArrayExpression
 * @typedef {import('@babel/types').Statement} Statement
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function take_takeRight({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};
declare namespace take_takeRight {
    export { T, Expression, ArrayExpression, Statement, CallExpressionPath };
}
type T = typeof babel.types;
type Expression = import('@babel/types').Expression;
type ArrayExpression = import('@babel/types').ArrayExpression;
type Statement = import('@babel/types').Statement;
type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;

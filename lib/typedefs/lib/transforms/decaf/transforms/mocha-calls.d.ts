export = mochaCalls;
/**
 * @typedef {import('@babel/types').FunctionExpression} FunctionExpression
 * @typedef {import('@babel/types').ArrowFunctionExpression} ArrowFunctionExpression
 * @typedef {import('@babel/types').BlockStatement} BlockStatement
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} CallExpressionPath
 * @typedef {import('@babel/traverse').Node} Node
 * @typedef {import('@babel/traverse').Visitor} Visitor
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function mochaCalls({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace mochaCalls {
    export { FunctionExpression, ArrowFunctionExpression, BlockStatement, Expression, CallExpressionPath, Node, Visitor };
}
type Visitor = import('@babel/traverse').Visitor;
type FunctionExpression = import('@babel/types').FunctionExpression;
type ArrowFunctionExpression = import('@babel/types').ArrowFunctionExpression;
type BlockStatement = import('@babel/types').BlockStatement;
type Expression = import('@babel/types').Expression;
type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;
type Node = import('@babel/traverse').Node;

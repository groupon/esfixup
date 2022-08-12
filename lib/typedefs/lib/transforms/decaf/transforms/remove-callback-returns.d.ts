export = removeCallbackReturns;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ReturnStatement>} ReturnStatementPath
 * @typedef {import('@babel/types').Expression} Expression
 * @typedef {import('@babel/types').CallExpression} CallExpression
 * @typedef {import('@babel/traverse').Node} Node
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function removeCallbackReturns({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace removeCallbackReturns {
    export { Visitor, ReturnStatementPath, Expression, CallExpression, Node };
}
type Visitor = import('@babel/traverse').Visitor;
type ReturnStatementPath = import('@babel/traverse').NodePath<import('@babel/types').ReturnStatement>;
type Expression = import('@babel/types').Expression;
type CallExpression = import('@babel/types').CallExpression;
type Node = import('@babel/traverse').Node;

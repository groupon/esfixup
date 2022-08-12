export = deGuard;
/**
 * @param {import('@babel/core')} babel
 * @returns {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function deGuard({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};
declare namespace deGuard {
    export { BabelTypes, Expression, LogicalExpression, CallExpression, FunctionDeclarationPath, CallExpressionPath, ConditionalExpressionPath };
}
type BabelTypes = typeof babel.types;
type Expression = import('@babel/types').Expression;
type LogicalExpression = import('@babel/types').LogicalExpression;
type CallExpression = import('@babel/types').CallExpression;
type FunctionDeclarationPath = import('@babel/traverse').NodePath<import('@babel/types').FunctionDeclaration>;
type CallExpressionPath = import('@babel/traverse').NodePath<CallExpression>;
type ConditionalExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').ConditionalExpression>;

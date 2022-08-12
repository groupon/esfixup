export = fakeAwaitToAsyncAwait;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function fakeAwaitToAsyncAwait({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace fakeAwaitToAsyncAwait {
    export { Expression, CallExpression, ClassBody, Visitor, Binding, Node, ProgramPath, BlockStatementPath, AssignmentExpressionPath, VariableDeclaration };
}
type Visitor = import('@babel/traverse').Visitor;
type Expression = import('@babel/types').Expression;
type CallExpression = import('@babel/types').CallExpression;
type ClassBody = import('@babel/types').ClassBody;
type Binding = import('@babel/traverse').Binding;
type Node = import('@babel/traverse').Node;
type ProgramPath = import('@babel/traverse').NodePath<import('@babel/types').Program>;
type BlockStatementPath = import('@babel/traverse').NodePath<import('@babel/types').BlockStatement>;
type AssignmentExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').AssignmentExpression>;
type VariableDeclaration = import('@babel/types').VariableDeclaration;

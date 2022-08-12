export = reorderRequire;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function reorderRequire({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace reorderRequire {
    export { Visitor, Node, Statement, Expression, VariableDeclaration };
}
type Visitor = import('@babel/traverse').Visitor;
type Node = import('@babel/traverse').Node;
type Statement = import('@babel/types').Statement;
type Expression = import('@babel/types').Expression;
type VariableDeclaration = import('@babel/types').VariableDeclaration;

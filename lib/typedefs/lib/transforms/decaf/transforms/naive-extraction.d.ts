export = minimalExtraction;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function minimalExtraction({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace minimalExtraction {
    export { Visitor, LVal, Expression, VariableDeclarationPath, ObjectPattern, ObjectProperty, Identifier, Node };
}
type Visitor = import('@babel/traverse').Visitor;
type LVal = import('@babel/types').LVal;
type Expression = import('@babel/types').Expression;
type VariableDeclarationPath = import('@babel/traverse').NodePath<import('@babel/types').VariableDeclaration>;
type ObjectPattern = import('@babel/types').ObjectPattern;
type ObjectProperty = import('@babel/types').ObjectProperty;
type Identifier = import('@babel/types').Identifier;
type Node = import('@babel/traverse').Node;

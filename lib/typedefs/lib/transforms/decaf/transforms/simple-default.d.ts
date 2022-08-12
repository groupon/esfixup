export = simpleDefault;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').FunctionDeclaration>} FunctionDeclarationPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ClassMethod>} ClassMethodPath
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').ObjectMethod>} ObjectMethodPath
 * @typedef {import('@babel/types').Expression} Expression
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function simpleDefault({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace simpleDefault {
    export { Visitor, FunctionDeclarationPath, ClassMethodPath, ObjectMethodPath, Expression };
}
type Visitor = import('@babel/traverse').Visitor;
type FunctionDeclarationPath = import('@babel/traverse').NodePath<import('@babel/types').FunctionDeclaration>;
type ClassMethodPath = import('@babel/traverse').NodePath<import('@babel/types').ClassMethod>;
type ObjectMethodPath = import('@babel/traverse').NodePath<import('@babel/types').ObjectMethod>;
type Expression = import('@babel/types').Expression;

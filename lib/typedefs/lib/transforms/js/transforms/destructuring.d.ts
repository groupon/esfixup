export = useDestructuring;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function useDestructuring({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace useDestructuring {
    export { Visitor, NodePath, VariableDeclaratorPath, ProgramPath, FunctionPath, Binding, Expression, Identifier, NumericLiteral, PropAssign, ArrayPropAssign, ObjectPropAssign, VariableDeclaration };
}
type Visitor = import('@babel/traverse').Visitor;
type NodePath = import('@babel/traverse').NodePath<import('@babel/types').Node>;
type VariableDeclaratorPath = import('@babel/traverse').NodePath<import('@babel/types').VariableDeclarator>;
type ProgramPath = import('@babel/traverse').NodePath<import('@babel/types').Program>;
type FunctionPath = import('@babel/traverse').NodePath<import('@babel/types').Function>;
type Binding = import('@babel/traverse').Binding;
type Expression = import('@babel/types').Expression;
type Identifier = import('@babel/types').Identifier;
type NumericLiteral = import('@babel/types').NumericLiteral;
type PropAssign = {
    objectBinding: false | undefined | Binding;
    object: Expression;
    key: string | number;
    value: string;
    path: VariableDeclaratorPath;
    array: boolean;
};
type ArrayPropAssign = PropAssign & {
    array: true;
    key: number;
};
type ObjectPropAssign = PropAssign & {
    array: false;
    key: string;
};
type VariableDeclaration = import('@babel/types').VariableDeclaration;

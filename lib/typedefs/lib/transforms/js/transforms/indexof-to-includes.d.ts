export = indexOfToIncludes;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function indexOfToIncludes({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace indexOfToIncludes {
    export { Visitor, Expression, PrivateName, CallExpression, UnaryExpression };
}
type Visitor = import('@babel/traverse').Visitor;
type Expression = import('@babel/types').Expression;
type PrivateName = import('@babel/types').PrivateName;
type CallExpression = import('@babel/types').CallExpression;
type UnaryExpression = import('@babel/types').UnaryExpression;

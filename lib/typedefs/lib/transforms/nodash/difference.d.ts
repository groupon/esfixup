export = difference;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function difference({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};
declare namespace difference {
    export { Expression, CallExpressionPath };
}
type Expression = import('@babel/types').Expression;
type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;

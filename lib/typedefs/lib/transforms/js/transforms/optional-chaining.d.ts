export = useOptionalChaining;
/**
 * @param {import('@babel/core')} babel
 * @returns {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function useOptionalChaining({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};
declare namespace useOptionalChaining {
    export { BabelTypes, Expression, SpreadElement, JSXNamespacedName, MemberExpression, OptionalMemberExpression, LogicalExpression, LogicalExpressionPath };
}
type BabelTypes = typeof babel.types;
type Expression = import('@babel/types').Expression;
type SpreadElement = import('@babel/types').SpreadElement;
type JSXNamespacedName = import('@babel/types').JSXNamespacedName;
type MemberExpression = import('@babel/types').MemberExpression;
type OptionalMemberExpression = import('@babel/types').OptionalMemberExpression;
type LogicalExpression = import('@babel/types').LogicalExpression;
type LogicalExpressionPath = import('@babel/traverse').NodePath<LogicalExpression>;

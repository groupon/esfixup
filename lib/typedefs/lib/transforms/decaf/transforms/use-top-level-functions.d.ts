export = useTopLevelFunctions;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function useTopLevelFunctions({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace useTopLevelFunctions {
    export { Visitor, AssignmentExpressionPath, AssignmentExpression, MemberExpression, Expression, Identifier, FunctionExpression, ArrowFunctionExpression, FnExpr };
}
type Visitor = import('@babel/traverse').Visitor;
type AssignmentExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').AssignmentExpression>;
type AssignmentExpression = import('@babel/types').AssignmentExpression;
type MemberExpression = import('@babel/types').MemberExpression;
type Expression = import('@babel/types').Expression;
type Identifier = import('@babel/types').Identifier;
type FunctionExpression = import('@babel/types').FunctionExpression;
type ArrowFunctionExpression = import('@babel/types').ArrowFunctionExpression;
type FnExpr = FunctionExpression | ArrowFunctionExpression;

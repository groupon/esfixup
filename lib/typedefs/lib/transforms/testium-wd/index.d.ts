export = transform;
/** @type {Transform} */
declare const transform: Transform;
declare namespace transform {
    export { Visitor, FunctionPath, CallExpressionPath, Transform };
}
type Transform = import('../../transform').Transform;
type Visitor = import('@babel/traverse').Visitor;
type FunctionPath = import('@babel/traverse').NodePath<import('@babel/types').Function>;
type CallExpressionPath = import('@babel/traverse').NodePath<import('@babel/types').CallExpression>;

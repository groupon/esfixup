export = arrayFlat;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function arrayFlat({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace arrayFlat {
    export { Expression, SpreadElement, Visitor };
}
type Visitor = import('@babel/traverse').Visitor;
type Expression = import('@babel/types').Expression;
type SpreadElement = import('@babel/types').SpreadElement;

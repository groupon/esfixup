export = splitDeclarations;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function splitDeclarations({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace splitDeclarations {
    export { Visitor };
}
type Visitor = import('@babel/traverse').Visitor;

export = fill;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function fill({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

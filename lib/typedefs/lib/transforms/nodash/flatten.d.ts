export = flatten;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function flatten({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

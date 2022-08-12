export = zip;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function zip({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

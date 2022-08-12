export = last;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function last({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

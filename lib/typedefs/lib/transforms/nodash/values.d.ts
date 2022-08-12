export = values;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function values({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

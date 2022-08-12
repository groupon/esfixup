export = uniq;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function uniq({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

export = concat;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function concat({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

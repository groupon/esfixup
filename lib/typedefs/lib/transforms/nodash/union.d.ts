export = union;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function union({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

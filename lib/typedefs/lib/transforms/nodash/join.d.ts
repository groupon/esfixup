export = join;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function join({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

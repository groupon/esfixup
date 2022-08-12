export = toPairs;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function toPairs({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

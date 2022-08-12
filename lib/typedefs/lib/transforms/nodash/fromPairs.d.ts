export = fromPairs;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function fromPairs({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

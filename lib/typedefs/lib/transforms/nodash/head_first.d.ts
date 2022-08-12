export = head_first;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function head_first({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

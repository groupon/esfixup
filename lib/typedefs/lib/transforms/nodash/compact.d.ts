export = compact;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function compact({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

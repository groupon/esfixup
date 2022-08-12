export = assign;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function assign({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

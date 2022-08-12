export = without;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function without({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

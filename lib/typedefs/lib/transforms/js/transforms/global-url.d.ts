export = removeURLRequire;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function removeURLRequire({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

export = initial;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function initial({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

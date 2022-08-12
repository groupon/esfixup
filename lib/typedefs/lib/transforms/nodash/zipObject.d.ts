export = zipObject;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function zipObject({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

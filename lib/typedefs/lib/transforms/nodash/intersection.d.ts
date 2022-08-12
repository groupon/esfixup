export = intersection;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function intersection({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

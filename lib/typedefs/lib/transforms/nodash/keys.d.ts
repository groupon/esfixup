export = keys;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function keys({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

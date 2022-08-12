export = unzip;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function unzip({ types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

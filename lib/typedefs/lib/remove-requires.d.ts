export = removeUnusedRequires;
/**
 * @param {string | RegExp} what
 * @param {import('@babel/core')} babel
 * @return {{ visitor: import('@babel/traverse').Visitor }}
 */
declare function removeUnusedRequires(what: string | RegExp, { types: t }: typeof babel): {
    visitor: import('@babel/traverse').Visitor;
};

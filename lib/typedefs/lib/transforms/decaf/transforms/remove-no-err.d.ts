export type Visitor = import('@babel/traverse').Visitor;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
export function removeNoErrDeclaration({ types: t }: typeof babel): {
    visitor: Visitor;
};
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
export function removeUnboundNoErr({ types: t }: typeof babel): {
    visitor: Visitor;
};

export = removeErrParam;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function removeErrParam({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace removeErrParam {
    export { Visitor };
}
type Visitor = import('@babel/traverse').Visitor;

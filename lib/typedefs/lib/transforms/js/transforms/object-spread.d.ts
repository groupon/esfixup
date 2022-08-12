export = objectAssignToSpread;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/types').Expression} Expression
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function objectAssignToSpread({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace objectAssignToSpread {
    export { Visitor, Expression };
}
type Visitor = import('@babel/traverse').Visitor;
type Expression = import('@babel/types').Expression;

export = splitAssignReturn;
/**
 * @typedef {import('@babel/traverse').Visitor} Visitor
 * @typedef {import('@babel/traverse').Node} Node
 * @typedef {import('@babel/types').AssignmentExpression} AssignmentExpression
 * @typedef {import('@babel/types').Identifier} Identifier
 * @typedef {import('@babel/types').MemberExpression} MemberExpression
 */
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function splitAssignReturn({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace splitAssignReturn {
    export { Visitor, Node, AssignmentExpression, Identifier, MemberExpression };
}
type Visitor = import('@babel/traverse').Visitor;
type Node = import('@babel/traverse').Node;
type AssignmentExpression = import('@babel/types').AssignmentExpression;
type Identifier = import('@babel/types').Identifier;
type MemberExpression = import('@babel/types').MemberExpression;

export = useCamelCase;
/**
 * @param {import('@babel/core')} babel
 * @return {{ visitor: Visitor }}
 */
declare function useCamelCase({ types: t }: typeof babel): {
    visitor: Visitor;
};
declare namespace useCamelCase {
    export { Visitor, Scope, Node };
}
type Visitor = import('@babel/traverse').Visitor;
type Scope = import('@babel/traverse').Scope;
type Node = import('@babel/traverse').Node;

export type FunctionPath = import('@babel/traverse').NodePath<import('@babel/types').Function>;
export type NodePath = import('@babel/traverse').NodePath<import('@babel/traverse').Node>;
export type BlockStatement = import('@babel/types').BlockStatement;
export type ReturnStatement = import('@babel/types').ReturnStatement;
export type Identifier = import('@babel/types').Identifier;
export type RestElement = import('@babel/types').RestElement;
export type Pattern = import('@babel/types').Pattern;
/**
 * @param {import('@babel/types')} t
 * @param {FunctionPath[]} fns
 */
export function fixupFunctions(t: typeof babel.types, fns: FunctionPath[]): void;

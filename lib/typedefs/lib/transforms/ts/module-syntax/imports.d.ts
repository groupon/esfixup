/**
 * converts top-level require(blah) to import blah
 *
 * @param {import('@babel/traverse').NodePath<babel.types.VariableDeclaration>} path
 * @param {babel.types.StringLiteral} sourceLiteral
 */
export function handleRequire(path: import('@babel/traverse').NodePath<babel.types.VariableDeclaration>, sourceLiteral: babel.types.StringLiteral): void;
/**
 * special-case for: const debug = require('debug')('name');
 *
 * @param {import('@babel/traverse').NodePath<babel.types.VariableDeclaration>} path
 * @param {babel.types.CallExpression} init
 */
export function handleDebug(path: import('@babel/traverse').NodePath<babel.types.VariableDeclaration>, init: babel.types.CallExpression): void;

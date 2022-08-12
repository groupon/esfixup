export type AssignmentExpressionPath = import('@babel/traverse').NodePath<babel.types.AssignmentExpression>;
/**
 * @typedef {import('@babel/traverse').NodePath<babel.types.AssignmentExpression>} AssignmentExpressionPath
 */
/**
 * @param {AssignmentExpressionPath} path
 * @param {babel.types.Identifier} id
 */
export function handleSingleExport(path: AssignmentExpressionPath, id: babel.types.Identifier): void;
/** @param {AssignmentExpressionPath} path */
export function handleBulkExport(path: AssignmentExpressionPath): void;

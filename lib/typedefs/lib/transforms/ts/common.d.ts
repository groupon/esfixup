export const COMMENT_TYPES: ('leadingComments' | 'trailingComments')[];
/**
 * @param {string} code
 * @returns {babel.types.TSType}
 */
export function parseTSTypeString(code: string): babel.types.TSType;

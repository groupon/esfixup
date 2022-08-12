export = isRequireOf;
/**
 * return true if the given path points at a require of the given string or
 * regexp match of a library
 *
 * @param {string | RegExp} what
 * @param {import('@babel/types')} t
 * @param {import('@babel/types').Node} node
 */
declare function isRequireOf(what: string | RegExp, t: typeof babel.types, node: import('@babel/types').Node): string | false;

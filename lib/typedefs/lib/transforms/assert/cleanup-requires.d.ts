export = cleanupRequiresPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function cleanupRequiresPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;
declare namespace cleanupRequiresPlugin {
    export { AssertState, ObjectPattern, ObjectProperty, Identifier };
}
type AssertState = import('./').AssertState;
type ObjectPattern = import('@babel/types').ObjectPattern;
type ObjectProperty = import('@babel/types').ObjectProperty;
type Identifier = import('@babel/types').Identifier;

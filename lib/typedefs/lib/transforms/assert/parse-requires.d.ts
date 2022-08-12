export = normalizeRequiresPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function normalizeRequiresPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;
declare namespace normalizeRequiresPlugin {
    export { AssertState, BabelTypes, ObjectProperty, Identifier };
}
type AssertState = import('./').AssertState;
type BabelTypes = typeof babel.types;
type ObjectProperty = import('@babel/types').ObjectProperty;
type Identifier = import('@babel/types').Identifier;

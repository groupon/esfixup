export = includePlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function includePlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;
declare namespace includePlugin {
    export { AssertState };
}
type AssertState = import('.').AssertState;

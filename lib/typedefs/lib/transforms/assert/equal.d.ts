export = equalPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function equalPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;
declare namespace equalPlugin {
    export { AssertState };
}
type AssertState = import('.').AssertState;

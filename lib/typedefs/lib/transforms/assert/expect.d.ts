export = expectPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function expectPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;
declare namespace expectPlugin {
    export { AssertState };
}
type AssertState = import('.').AssertState;

export = notMatchPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function notMatchPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;
declare namespace notMatchPlugin {
    export { AssertState };
}
type AssertState = import('./').AssertState;

export = rejectsPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function rejectsPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;

export = truthyPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function truthyPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;

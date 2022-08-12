export = throwsPlugin;
/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
declare function throwsPlugin({ types: t }: typeof babel): import('@babel/core').PluginObj;

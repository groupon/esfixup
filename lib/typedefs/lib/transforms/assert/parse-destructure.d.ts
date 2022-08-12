export = parseDestructure;
/**
 * @typedef {import('@babel/types')} BabelTypes
 * @typedef {import('@babel/types').ObjectProperty} ObjectProperty
 */
/**
 * @param {BabelTypes} t
 * @param {(ObjectProperty | import('@babel/types').RestElement)[]} ps
 */
declare function parseDestructure(t: BabelTypes, ps: (ObjectProperty | import('@babel/types').RestElement)[]): [string, string][];
declare namespace parseDestructure {
    export { BabelTypes, ObjectProperty };
}
type BabelTypes = typeof babel.types;
type ObjectProperty = import('@babel/types').ObjectProperty;

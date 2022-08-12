export = assertiveToAssert;
/**
 * @typedef {import('@babel/types').ObjectPattern} ObjectPattern
 *
 * @typedef AssertState
 * @property {true | Record<string, string>} [assert] How assert is remapped (if is)
 * @property {true | Record<string, string>} [assertive] How assertive is required/remapped
 * @property {true} [dirty] Whether we've done any transforms
 */
/** @type {import('../../transform').Transform} */
declare const assertiveToAssert: import('../../transform').Transform;
declare namespace assertiveToAssert {
    export { ObjectPattern, AssertState };
}
type ObjectPattern = import('@babel/types').ObjectPattern;
type AssertState = {
    /**
     * How assert is remapped (if is)
     */
    assert?: true | Record<string, string> | undefined;
    /**
     * How assertive is required/remapped
     */
    assertive?: true | Record<string, string> | undefined;
    /**
     * Whether we've done any transforms
     */
    dirty?: true | undefined;
};

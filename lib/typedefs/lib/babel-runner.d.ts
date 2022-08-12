export type TransformOptions = import('@babel/core').TransformOptions;
export type BabelFileResult = import('@babel/core').BabelFileResult;
export type Program = import('@babel/types').Program;
/**
 * @typedef {import('@babel/core').TransformOptions} TransformOptions
 * @typedef {import('@babel/core').BabelFileResult} BabelFileResult
 * @typedef {import('@babel/types').Program} Program
 */
export class BabelRunner {
    /**
     * @param {string} initSource
     * @param {string} sourceFilename
     * @param {TransformOptions[]} passes
     * @returns {Promise<string | null>}
     */
    static runAllPasses(initSource: string, sourceFilename: string, passes: TransformOptions[]): Promise<string | null>;
    /**
     * @param {string} initSource
     * @param {string} sourceFilename
     */
    constructor(initSource: string, sourceFilename: string);
    /** @type {string} */
    code: string;
    /** @type {string} */
    filename: string;
    /** @type {Program | null} */
    ast: Program | null;
    defaultOptions(): {
        babelrc: boolean;
        configFile: false;
        filename: string;
        sourceType: "script";
        ast: boolean;
    };
    getAST(): babel.types.Program;
    /** @param {TransformOptions} options */
    run(options: TransformOptions): Promise<string>;
}
import babel = require("@babel/core");

export type Transform = {
    name: string;
    descr?: string | undefined;
    order: number;
    inExt?: string | undefined;
    outExt?: string | undefined;
    fileName?: string | undefined;
    transform: (content: string, inFile: string, outFile: string, nodeVersion: string) => Promise<string | null>;
};
export type RunOpts = {
    lintFix?: boolean | undefined;
    transforms?: Transform[] | undefined;
    nodeVersion: string;
    logger?: ((transformName: string, message: string) => void) | undefined;
};
/**
 * @typedef Transform
 * @property {string} name
 * @property {string} [descr]
 * @property {number} order
 * @property {string} [inExt]
 * @property {string} [outExt]
 * @property {string} [fileName]
 * @property {(
 *   content: string,
 *   inFile: string,
 *   outFile: string,
 *   nodeVersion: string
 * ) => Promise<string | null>} transform
 *
 * @typedef RunOpts
 * @property {boolean} [lintFix]
 * @property {Transform[]} [transforms]
 * @property {string} nodeVersion
 * @property {(transformName: string, message: string) => void} [logger]
 */
export function loadTransforms(): Transform[];
/**
 * @param {string[]} filesOrDirs
 * @param {RunOpts} opts
 */
export function runTransforms(filesOrDirs: string[], { transforms, lintFix, nodeVersion, logger }: RunOpts): Promise<void>;

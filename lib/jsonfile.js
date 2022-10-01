import fsPromises from 'fs/promises';
import { promisify } from 'util';
import { gunzip as _gunzip, gzip as _gzip } from 'zlib';
const gunzip = promisify(_gunzip), gzip = promisify(_gzip);

/**
 * @param {string} fPath
 * @param {boolean} gzipped
 */
export async function readDataFile(fPath, gzipped = false) {
    let data = await fsPromises.readFile(fPath);
    if (gzipped) {
        data = await gunzip(data);
    }
    return data;
}
/**
 * @param {string} fPath
 * @param {Buffer | string} data
 * @param {boolean} gzipped
 */
export async function writeDataFile(fPath, data, needGzip = false) {
    if (typeof data === 'string') {
        data = Buffer.from(data);
    }
    if (needGzip) {
        data = await gzip(data);
    }
    fsPromises.writeFile(fPath, data);
}

/**
 * @param {string} fPath
 * @param {Object} options
 * @param {BufferEncoding} options.encoding
 * @param {boolean} options.gzipped
 * @returns {Promise<any[] | Record<string, any>>}
 */
export async function readJSON(fPath, {encoding = 'utf-8', gzipped = false} = {}) {
    let data = await readDataFile(fPath, gzipped);
    return JSON.parse(data.toString(encoding));
}

/**
 * @param {string} fPath
 * @param {any[] | Record<string, any>} obj
 * @param {boolean} gzipped
 */
export async function writeJSON(fPath, obj, needGzip = false) {
    let json = JSON.stringify(obj);
    await writeDataFile(fPath, json, needGzip);
}

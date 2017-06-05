import * as fs from "fs";
import * as request from "request";
import {parse} from "url";
import {posix} from "path";
import * as Debug from "debug";
import * as _ from "lodash";
const debug = Debug('utils.x');

const MKDIRP = require("mkdirp");
const BLANK_STRING = '';
const PATH_SP = '/';
const DEFAULT_UA = 'OKSpiderBot/1.0';

const PRESENT_AGENTS = [
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1",
    "(KHTML, like Gecko) Chrome/22.0.1207.1 Safari/537.1",
    "Mozilla/5.0 (X11; CrOS i686 2268.111.0) AppleWebKit/536.11",
    "(KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.6",
    "(KHTML, like Gecko) Chrome/20.0.1092.0 Safari/536.6",
    "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6",
    "(KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6",
    "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.1",
    "(KHTML, like Gecko) Chrome/19.77.34.5 Safari/537.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.5",
    "(KHTML, like Gecko) Chrome/19.0.1084.9 Safari/536.5",
    "Mozilla/5.0 (Windows NT 6.0) AppleWebKit/536.5",
    "(KHTML, like Gecko) Chrome/19.0.1084.36 Safari/536.5",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1063.0 Safari/536.3",
    "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1063.0 Safari/536.3",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_0) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1063.0 Safari/536.3",
    "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1062.0 Safari/536.3",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1062.0 Safari/536.3",
    "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1061.1 Safari/536.3",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1061.1 Safari/536.3",
    "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1061.1 Safari/536.3",
    "Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.3",
    "(KHTML, like Gecko) Chrome/19.0.1061.0 Safari/536.3",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.24",
    "(KHTML, like Gecko) Chrome/19.0.1055.1 Safari/535.24",
    "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/535.24",
    "(KHTML, like Gecko) Chrome/19.0.1055.1 Safari/535.24"
];

function getSuffix(str: string): string {
    let idx = str.lastIndexOf('.');
    return str.substring(idx);
}

function getParentPath(path: string): string {
    let idx = path.lastIndexOf(PATH_SP);
    return path.substring(0, idx);
}

function download2(url: string, rename: string, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let i = (Math.random() * PRESENT_AGENTS.length) >> 0;
        let c = {
            timeout: timeout,
            headers: {
                'User-Agent': PRESENT_AGENTS[i]
            }
        };
        request.get(url, c)
            .once('error', err => {
                reject(err);
            })
            .once('response', res => {
                let writer = fs.createWriteStream(rename);
                writer.once('finish', () => resolve());
                writer.once('error', err => reject(err));
                res.pipe(writer);
            });
    });
}

function isFileExists(file: string): Promise<boolean> {
    return new Promise<boolean>((resolve, ignore) => {
        fs.exists(file, exists => {
            resolve(exists);
        });
    });
}

function unlinkFile(file: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.unlink(file, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function download(url: string, rename: string, overwrite: boolean, timeout: number): Promise<void> {
    let exists = await isFileExists(rename);
    if (!exists) {
        await download2(url, rename, timeout);
        return;
    }
    if (!overwrite) {
        return;
    }
    await unlinkFile(rename);
    await download2(url, rename, timeout);
}

function mkdirp(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        MKDIRP(path, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function delay<T>(promise: Promise<T>, delay: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        setTimeout(() => promise.then(t => resolve(t)).catch(err => reject(err)), delay);
    });
}

function normalize(url: string, parent?: string): string {
    let ret: string = undefined;
    let u1 = parse(url);
    let path = posix.normalize(u1.pathname);
    if (u1.host && u1.protocol) {
        ret = `${u1.protocol}//${u1.host}${path || ''}${u1.search || ''}`;
    } else if (parent) {
        let u2 = parse(parent);
        if (u2.hostname && u2.protocol) {
            let newPath = _.startsWith(u1.pathname, '/') ? u1.pathname : u2.pathname + '/' + url;
            let u3 = parse(newPath);
            ret = `${u2.protocol}//${u2.host}${posix.normalize(u3.pathname) || ''}${u3.search || ''}`;
        }
    }
    debug('normalize: %s => %s (parent=%s)', url, ret, parent);
    return ret;
}

export {
    BLANK_STRING,
    PATH_SP,
    download,
    getSuffix,
    getParentPath,
    mkdirp,
    DEFAULT_UA,
    delay,
    PRESENT_AGENTS,
    normalize
}

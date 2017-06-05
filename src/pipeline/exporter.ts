import {Item, Pipeline} from "../api";
import * as fs from "fs";
import * as Debug from "debug";
import {isNullOrUndefined} from "util";
import * as os from "os";
import {getParentPath, mkdirp} from "../utils/x";
import {EventEmitter} from "events";

const debug = Debug('pipeline.exporter');

abstract class AbstractFileExporter<T extends Item> implements Pipeline<T> {

    private static EVENT = Symbol();

    private events: EventEmitter = new EventEmitter();

    protected path: string;
    protected fd: number = undefined;

    private overwrite: boolean;
    private line: boolean;

    constructor(path: string, line: boolean = true, overwrite: boolean = false) {
        this.path = path;
        this.overwrite = overwrite;
        this.line = line;
    }

    private writeLine(): Promise<void> {
        if (isNullOrUndefined(this.fd)) {
            return Promise.reject(new Error('cannot write line: fd is null.'));
        }
        return new Promise<void>((resolve, reject) => {
            fs.write(this.fd, os.EOL, err => {
                if (err) {
                    console.error('write line failed: %s.', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private openFile(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let flag: string = this.overwrite ? 'w+' : 'a+';
            fs.open(this.path, flag, (err, fd) => {
                if (err) {
                    console.log('open file %s failed: %s', this.path, err);
                    reject(err);
                    return;
                }
                this.fd = fd;
                resolve();
            });
        });
    }

    async onStart(): Promise<void> {
        let exists = fs.existsSync(this.path);
        if (!exists) {
            await mkdirp(getParentPath(this.path));
            await this.openFile();
        } else {
            await this.openFile();
            if (!this.overwrite && this.line) {
                await this.writeLine();
            }
        }
    }

    onStop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.close(this.fd, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    abstract serialize(t: T): Promise<string>;

    pipe(t: T): Promise<T> {
        if (isNullOrUndefined(this.fd)) {
            return Promise.reject(new Error('cannot write file: fd is undefined.'));
        }

        return new Promise<T>((resolve, reject) => {
            this.serialize(t)
                .then(res => {
                    let s = this.line ? res + os.EOL : res;
                    fs.write(this.fd, s, (err, written, ignore) => {
                        if (err) {
                            console.error('write item into file %s failed: %s', this.path, err);
                            reject(err);
                        } else {
                            debug('write item[%s] success: %d bytes.', t.id, written);
                            resolve(t);
                        }
                    });
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    publish(t: T): Promise<void> {
        if (isNullOrUndefined(this.fd)) {
            return Promise.reject(new Error('cannot write file: fd is undefined.'));
        }
        return new Promise<void>((resolve, reject) => {
            this.serialize(t)
                .then(res => {
                    let s = this.line ? res + os.EOL : res;
                    fs.write(this.fd, s, (err, written, ignore) => {
                        if (err) {
                            console.error('write item into file %s failed: %s', this.path, err);
                            reject(err);
                        } else {
                            debug('write item[%s] success: %d bytes.', t.id, written);
                            this.events.emit(AbstractFileExporter.EVENT, t);
                            resolve();
                        }
                    });
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    subscribe(cb: (t: T) => void): Pipeline<T> {
        this.events.on(AbstractFileExporter.EVENT, cb);
        return this;
    }
}

class JsonFileExporter<T extends Item> extends AbstractFileExporter<T> {

    serialize(t: T): Promise<string> {
        return Promise.resolve(JSON.stringify(t));
    }

}

export {JsonFileExporter}


import {Item, Pipeline} from "../api";
import {EventEmitter} from "events";
import {murmur32} from "../utils/hasher";
import * as Debug from "debug";
import * as os from "os";
import * as _ from "lodash";
import Timer = NodeJS.Timer;
const level = require("levelup");

const debug = Debug('pipeline.limit');

class LimitPipeline<T extends Item> implements Pipeline<T> {

    private static EVENT = Symbol();
    private events: EventEmitter = new EventEmitter();
    private keys: string[] = [];
    private db: any;
    private timer: Timer;
    private delay: number;
    private path: string;

    constructor(delay: number) {
        this.delay = delay;
        this.path = `${os.tmpdir()}/oks.tmp.${_.now()}`;
    }

    private next(): Promise<T> {
        let key = this.keys.shift();
        if (!key) {
            return Promise.reject(new Error('Keys is empty.'));
        }
        return new Promise<T>((resolve, reject) => {
            this.db.get(key, (err, value) => {
                if (err) {
                    reject(err);
                } else {
                    let t = JSON.parse(value) as T;
                    resolve(t);
                }
            });
        });
    }

    async onStart(): Promise<void> {
        if (this.timer) {
            return;
        }
        this.db = level(this.path);
        this.timer = setInterval(async () => {
            try {
                let t = await this.next();
                if (t) {
                    this.events.emit(LimitPipeline.EVENT, t);
                }
            } catch (e) {
                debug('try next item failed: %s', e);
            }
        }, this.delay);
    }

    async onStop(): Promise<void> {
        if (!this.timer) {
            return;
        }
        clearInterval(this.timer);
        this.timer = undefined;
        this.db.close(() => {
            //TODO delete files.
        });
    }

    publish(t: T): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let key = murmur32(new Buffer(t.id)).toString('hex');
            this.db.put(key, JSON.stringify(t), err => {
                if (err) {
                    reject(err);
                } else {
                    this.keys.push(key);
                    resolve();
                }
            });
        });
    }

    subscribe(cb: (t: T) => void): Pipeline<T> {
        this.events.on(LimitPipeline.EVENT, cb);
        return this;
    }
}

export default LimitPipeline;
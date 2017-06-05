import {Middleware, XRequest} from "../api";
import {murmur32} from "../utils/hasher";
import * as Debug from "debug";
import * as os from "os";
import * as _ from "lodash";
import Timer = NodeJS.Timer;
const level = require("levelup");

const debug = Debug('middleware.limit');

class RequestLimitMiddleware extends Middleware<XRequest> {

    private db: any;
    private keys: string[] = [];
    private timer: Timer;
    private path: string;

    constructor(sleep: number) {
        super();
        this.path = `${os.tmpdir()}/ok.spider.tmp.${_.now()}${_.uniqueId()}`;
        this.db = level(this.path);
        this.timer = setInterval(async () => {
            try {
                let req: XRequest = await this.next();
                if (req) {
                    this.publish(req);
                }
            } catch (e) {
                debug('try get next request failed: %s', e);
            }
        }, sleep);
    }

    private next(): Promise<XRequest> {
        let key = this.keys.shift();
        if (!key) {
            return Promise.reject(new Error('Nothing in request queue!'));
        }
        return new Promise<XRequest>((resolve, reject) => {
            this.db.get(key, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(res) as XRequest);
                }
            });
        });
    }

    process(t: XRequest): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let key = murmur32(new Buffer(t.url)).toString('hex');
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
}

export default RequestLimitMiddleware;

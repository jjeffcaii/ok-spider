import {Downloader, Middleware, XRequest, XResponse} from "../api";
import * as _ from "lodash";

import * as Debug from "debug";
import {EventEmitter} from "events";

const debug = Debug('downloader.base');

abstract class AbstractDownloader implements Downloader {

    private static EVENT = Symbol();

    private middlewares: Middleware<XRequest>[];
    private events: EventEmitter;

    constructor(middlewares?: Middleware<XRequest>[]) {
        this.events = new EventEmitter();
        this.middlewares = middlewares || [];
        if (!middlewares) {
            return;
        }
        for (let i = 0, len = this.middlewares.length - 1; i < len; i++) {
            this.middlewares[i].subscribe(t => {
                this.middlewares[i + 1].process(t)
                    .then(() => {
                        debug('submit request to middleware[%d] success.', i + 1);
                    })
                    .catch(err => {
                        console.warn('submit request to middleware[%d] failed: %s', i + 1, err);
                    });
            });
        }
        _.last(this.middlewares).subscribe(t => this.execute(t));
    }

    private execute(req: XRequest) {
        this.call(req)
            .then(res => {
                this.events.emit(AbstractDownloader.EVENT, res);
            })
            .catch(err => {
                debug('execute request failed: req=%j, err=%s', req, err);
            });
    }

    async submit(req: string | XRequest): Promise<void> {
        let xreq: XRequest = undefined;
        if (_.isString(req)) {
            xreq = {
                url: req as string,
                headers: {},
                cookies: {}
            };
        } else {
            xreq = req as XRequest;
        }

        if (!this.middlewares) {
            this.execute(xreq);
        } else {
            _.first(this.middlewares).process(xreq);
        }
    }

    subscribe(cb: (t: XResponse) => void): Downloader {
        this.events.on(AbstractDownloader.EVENT, cb);
        return this;
    }

    abstract call(req: XRequest): Promise<XResponse>;

}

export {AbstractDownloader}
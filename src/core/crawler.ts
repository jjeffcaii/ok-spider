import {Downloader, Item, Middleware, Pipeline, XRequest} from "../api";
import DownloaderImpl from "../downloader/downloader";
import {Spider} from "./spider";
import * as Debug from "debug";
import {isNullOrUndefined} from "util";
import {DEFAULT_UA} from "../utils/x";
import * as _ from "lodash";

const debug = Debug('index');

interface Crawler {

    start(cb?: () => void);

}

class Builder<T extends Item> {

    private spider: Spider<T>;
    private pipelines: Pipeline<T>[] = [];
    private middlewares: Middleware<XRequest>[] = [];

    constructor(spider: Spider<T>) {
        this.spider = spider;
    }

    pipeline(...pipelines: Pipeline<T>[]): Builder<T> {
        for (const it of pipelines) {
            this.pipelines.push(it);
        }
        return this;
    }

    middleware(middleware: Middleware<XRequest>): Builder<T> {
        this.middlewares.push(middleware);
        return this;
    }

    build(): Crawler {
        let downloader: Downloader = new DownloaderImpl(this.middlewares);
        downloader.subscribe(response => this.spider.emit(Spider.EVENT_RESP, response));

        if (!this.pipelines || _.isEmpty(this.pipelines)) {
            throw new Error('Pipeline Not Found!');
        }

        let first = _.first(this.pipelines);
        for (let i = 0, len = this.pipelines.length - 1; i < len; i++) {
            this.pipelines[i].subscribe(async t => await this.pipelines[i + 1].publish(t));
        }
        this.spider.once(Spider.EVENT_START_PRE, async () => {
            for (let pipeline of this.pipelines) {
                try {
                    await pipeline.onStart();
                } catch (e) {
                    console.warn('start pipeline failed: %s', e);
                }
            }
            debug('accept spider event: EVENT_START_PRE.');
            this.spider.emit(Spider.EVENT_START);
        });

        this.spider.once(Spider.EVENT_STOP, async () => {
            for (let pipeline of this.pipelines) {
                try {
                    await pipeline.onStop();
                } catch (e) {
                    console.warn('stop pipeline failed: %s', e);
                }
            }
        });

        this.spider.on(Spider.EVENT_ITEM, async item => await first.publish(item));
        this.spider.on(Spider.EVENT_NEXT, async (url, parent) => {
            let req: XRequest = {
                url: url,
                headers: {
                    'User-Agent': DEFAULT_UA
                }
            };
            if (parent) {
                req.headers['Referer'] = parent;
            }
            await downloader.submit(req);
        });

        return {
            start: (cb?: () => void) => {
                if (!isNullOrUndefined(cb)) {
                    this.spider.once(Spider.EVENT_START, cb);
                }
                this.spider.emit(Spider.EVENT_START_PRE);
            }
        };
    }

}

export {Builder}
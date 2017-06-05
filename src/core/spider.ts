import {EventEmitter} from "events";
import * as _ from "lodash";

import * as Debug from "debug";
import {BloomFilter, Item, XResponse} from "../api";
import {normalize} from "../utils/x";
import {parse} from "url";
import BufferedBloomFilter from "../bloomfilter/buffered";

const debug = Debug('core.spider');

interface SpiderOptions {
    startUrls: string[] | string;
    allowDomains: string[] | string;
}

abstract class Spider<T extends Item> extends EventEmitter {

    static EVENT_ITEM = Symbol();
    static EVENT_NEXT = Symbol();
    static EVENT_ERROR = Symbol();
    static EVENT_RESP = Symbol();
    static EVENT_START_PRE = Symbol();
    static EVENT_START = Symbol();
    static EVENT_STOP = Symbol();

    protected name: string;
    protected options: SpiderOptions;

    private domains: Set<string>;
    private bloomfilter: BloomFilter;

    constructor(name: string, options: SpiderOptions, bloomfilter?: BloomFilter) {
        super();
        this.domains = new Set<string>();
        this.name = name;
        this.options = options;
        this.bloomfilter = bloomfilter || new BufferedBloomFilter();
        if (_.isArray(this.options.allowDomains)) {
            _.each(this.options.allowDomains, it => this.domains.add(it));
        } else {
            this.domains.add(this.options.allowDomains as string);
        }
        this.on(Spider.EVENT_RESP, (response: XResponse) => this.parse(response));
        this.on(Spider.EVENT_START, () => {
            this.next(this.options.startUrls);
            debug('spider %s started!', this.name);
        });
    }

    protected ok(items: T[] | T): Spider<T> {
        if (!items) {
            return this;
        }
        if (_.isArray(items)) {
            for (const item of (items as T[])) {
                this.emit(Spider.EVENT_ITEM, item);
            }
        } else {
            this.emit(Spider.EVENT_ITEM, items as T);
        }
        return this;
    }

    private async handleNext(url: string, parent?: string): Promise<boolean> {
        let current = normalize(url, parent);
        if (!current) {
            return Promise.resolve(false);
        }
        let hostname = parse(current).hostname;
        if (!this.domains.has(hostname)) {
            debug('Domain forbiden: %s', current);
            return false;
        }
        let exists = await this.bloomfilter.mayContain(current);
        if (exists) {
            debug('URL may has been processed already: %s.', current);
            return false;
        }
        await this.bloomfilter.put(current);
        this.emit(Spider.EVENT_NEXT, current, parent);
        return true;
    }

    protected next(url: string[] | string, parent?: string): Spider<T> {
        let urls = _.concat([], url);
        _.each(urls, it => {
            this.handleNext(it, parent)
                .then(success => {
                    if (success) {
                        debug('bingo -> %s', it);
                    }
                })
                .catch(err => {
                    console.error('process source failed: %s', err);
                });
        });
        return this;
    }

    abstract parse(response: XResponse);

}

export {SpiderOptions, Spider};
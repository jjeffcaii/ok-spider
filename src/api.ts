import {EventEmitter} from "events";
interface Proxy {
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    }
}

interface XRequest {
    url: string;
    retry?: number;
    headers?: { [key: string]: string };
    cookies?: { [key: string]: string };
    proxy?: Proxy;
}

interface XResponse {
    readonly html: string;
    readonly status: number;
    readonly source?: string;
    isSuccessful: () => boolean;
}

abstract class Middleware<T> {

    private static EVENT = Symbol();

    private events: EventEmitter;

    constructor() {
        this.events = new EventEmitter();
    }

    abstract process(t: T): Promise<void>;

    protected publish(t: T) {
        this.events.emit(Middleware.EVENT, t);
    }

    subscribe(cb: (t: T) => void): Middleware<T> {
        this.events.on(Middleware.EVENT, cb);
        return this;
    }

}


interface Downloader {

    submit(req: string | XRequest): Promise<void>;

    subscribe(cb: (t: XResponse) => void): Downloader;

}

interface BloomFilter {

    put(str: string): Promise<void>;

    mayContain(str: string): Promise<boolean>;

}

interface Selector<T> {
    extract(): T[];
    extractFirst(): T;
}

abstract class AbstractSelector<T> implements Selector<T> {

    protected response: XResponse;

    constructor(response: XResponse) {
        this.response = response;
    }

    abstract extract(): T[];

    extractFirst(): T {
        let items = this.extract();
        return items && items.length > 0 ? items[0] : undefined;
    }

}

interface Item {
    id: string;
}

interface Pipeline<T extends Item> {

    onStart(): Promise<void>;

    onStop(): Promise<void>;

    publish(t: T): Promise<void>;

    subscribe(cb: (t: T) => void): Pipeline<T>;

}

export {
    Proxy,
    XRequest,
    XResponse,
    Middleware,
    Downloader,
    BloomFilter,
    Selector,
    AbstractSelector,
    Item,
    Pipeline
}
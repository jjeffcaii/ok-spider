import {Item, Pipeline} from "../api";
import {EventEmitter} from "events";

class PrintPipeline<T extends Item> implements Pipeline<T> {
    private static EVENT = Symbol();
    private events: EventEmitter = new EventEmitter();

    private count = 0;
    private template: string;

    constructor(json?: boolean) {
        this.template = json ? 'NO.%d => %j' : 'NO.%d => %s';
    }

    onStart(): Promise<void> {
        return Promise.resolve();
    }

    onStop(): Promise<void> {
        return Promise.resolve();
    }

    async publish(t: T): Promise<void> {
        console.log(this.template, ++this.count, t);
        this.events.emit(PrintPipeline.EVENT, t);
    }

    subscribe(cb: (t: T) => void): Pipeline<T> {
        this.events.on(PrintPipeline.EVENT, cb);
        return this;
    }
}

export default PrintPipeline;
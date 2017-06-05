import {BloomFilter, Item, Pipeline} from "../api";
import {EventEmitter} from "events";
import BufferedBloomFilter from "../bloomfilter/buffered";

class DuplicateRemovePipeline<T extends Item> implements Pipeline<T> {

    private static EVENT = Symbol();

    private events: EventEmitter = new EventEmitter();
    private bloomfilter: BloomFilter = new BufferedBloomFilter();

    onStart(): Promise<void> {
        return Promise.resolve();
    }

    onStop(): Promise<void> {
        return Promise.resolve();
    }

    async publish(t: T): Promise<void> {
        let contains = await this.bloomfilter.mayContain(t.id);
        if (!contains) {
            await this.bloomfilter.put(t.id);
            this.events.emit(DuplicateRemovePipeline.EVENT, t);
        }
    }

    subscribe(cb: (t: T) => void): Pipeline<T> {
        this.events.on(DuplicateRemovePipeline.EVENT, cb);
        return this;
    }

}

export default DuplicateRemovePipeline;
import {Item, Pipeline} from "../api";
import * as _ from "lodash";
import {download, getParentPath, mkdirp, PATH_SP} from "../utils/x";
import * as Debug from "debug";
import {EventEmitter} from "events";
import Timer = NodeJS.Timer;

const debug = Debug('pipeline.filedownloader');

export interface DownloadInfo {
    url: string;
    name?: string;
    overwrite?: boolean;
}

export type Picker<T extends Item> = (t: T) => DownloadInfo[];

class FileDownloaderPipeline<T extends Item> implements Pipeline<T> {

    private static EVENT = Symbol();
    private events: EventEmitter = new EventEmitter();

    protected dir: string;
    protected retry: number;
    protected timeout: number;
    protected picker: Picker<T>;

    constructor(dir: string, picker: Picker<T>, retry: number = 1, timeout: number = 60000) {
        this.dir = _.trimEnd(dir, PATH_SP);
        this.picker = picker;
        this.retry = retry;
        this.timeout = timeout;
    }

    async onStart(): Promise<void> {
        await mkdirp(this.dir);
    }

    async onStop(): Promise<void> {
    }

    private async execute(file: DownloadInfo): Promise<void> {
        await mkdirp(getParentPath(file.name));
        await download(file.url, file.name, file.overwrite, this.timeout);
        debug('file %s saved.', file.name);
    }

    async publish(t: T): Promise<void> {
        let files = this.picker(t);
        for (const file of files) {
            let rename: string = file.name;
            if (!rename) {
                let idx = file.url.lastIndexOf(PATH_SP);
                rename = t.id + PATH_SP + file.url.substring(idx + 1);
            }
            file.name = this.dir + PATH_SP + _.trim(rename, PATH_SP);
            await this.execute(file);
        }
        this.events.emit(FileDownloaderPipeline.EVENT, t);
    }

    subscribe(cb: (t: T) => void): Pipeline<T> {
        this.events.on(FileDownloaderPipeline.EVENT, cb);
        return this;
    }
}

export default FileDownloaderPipeline;
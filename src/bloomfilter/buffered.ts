import {BloomFilter} from "../api";
import * as _ from "lodash";
import {isBuffer, isNumber} from "util";
import {murmur32} from "../utils/hasher";

class BufferedBloomFilter implements BloomFilter {

    private static BITS_PER_MB = 8388608; // 8 * 1024 * 1024
    private static seeds = [0x01, 0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02];

    static DEFAULT_SIZE = 8388608;

    readonly buffer: Buffer;
    private readonly k: number;
    private readonly bits: number;

    constructor(bits: (number | Buffer) = BufferedBloomFilter.DEFAULT_SIZE, k: number = 4) {
        this.k = k;
        if (isBuffer(bits)) {
            this.buffer = bits as Buffer;
            this.bits = this.buffer.length * 8;
        } else if (isNumber(bits)) {
            // LIMIT: 1MB ~ 512MB
            let len = _.clamp(bits as number, BufferedBloomFilter.BITS_PER_MB, 512 * BufferedBloomFilter.BITS_PER_MB) >> 3;
            this.buffer = Buffer.alloc(len);
            this.bits = len * 8;
        } else {
            throw new Error('Not valid argument: number or buffer is required.');
        }
    }

    private write(index: number) {
        let seek = index >> 3;
        let mod = index & 7;
        let byte = this.buffer.readUInt8(seek);
        this.buffer.writeUInt8(byte | BufferedBloomFilter.seeds[mod], seek);
    }

    private read(index: number): number {
        let seek = index >> 3;
        let mod = index & 7;
        let byte = this.buffer.readUInt8(seek);
        let seed = BufferedBloomFilter.seeds[mod];
        return (byte & seed) === seed ? 1 : 0;
    }

    private calculate(str: string): number[] {
        let ret: number[] = [];
        for (let i = 0; i < this.k; i++) {
            ret[i] = murmur32(new Buffer(`${str}\u0001\u0001\u0001\u0001${i}`)).readUInt32LE(0) % this.bits;
        }
        return ret;
    }

    async put(str: string): Promise<void> {
        let indexes = this.calculate(str);
        for (let i = 0, len = indexes.length; i < len; i++) {
            this.write(indexes[i]);
        }
    }

    async mayContain(str: string): Promise<boolean> {
        let indexes = this.calculate(str);
        let result = true;
        for (let i = 0, len = indexes.length; i < len; i++) {
            if (!this.read(indexes[i])) {
                result = false;
                break;
            }
        }
        return result;
    }
}

export default BufferedBloomFilter;
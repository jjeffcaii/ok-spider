const murmur = require("murmurhash-native");

export function murmur32(buffer: Buffer): Buffer {
    return murmur.LE.murmurHash32(buffer, 'buffer');
}

export function murmur128(buffer: Buffer): Buffer {
    return murmur.LE.murmurHash128(buffer, 'buffer');
}
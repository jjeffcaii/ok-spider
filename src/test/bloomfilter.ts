import PersistBloomFilter from "../bloomfilter/buffered";
import {assert} from "chai";
import * as _ from "lodash";

describe('BloomFilter Test', () => {
    const bloomfilter = new PersistBloomFilter();

    it('#testAll', async () => {
        let str = 'abc';
        assert.isNotOk(await bloomfilter.mayContain(str));
        await bloomfilter.put(str);
        assert.isOk(await bloomfilter.mayContain(str));
    });

    it('#foobar', async () => {
        let keys = [
            "//s2.nb-pintai.com/2017/05/14945247368480.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368480.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368501.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368512.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368523.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368524.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368535.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368536.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368537.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368548.jpg",
            "//s2.nb-pintai.com/2017/05/14945247368579.jpg",
            "//s2.nb-pintai.com/2017/05/149452473686010.jpg",
            "//s2.nb-pintai.com/2017/05/149452473686111.jpg",
            "//s2.nb-pintai.com/2017/05/149452473686112.jpg",
            "//s2.nb-pintai.com/2017/05/149452473686213.jpg",
            "//s2.nb-pintai.com/2017/05/149452473686414.jpg",
            "//s2.nb-pintai.com/2017/05/149452473688315.jpg",
            "http://s2.nb-pintai.com/2017/05/149452473688416.jpg"
        ];
        let promises = _.map(keys, it => {
            return bloomfilter.mayContain(it)
                .then(contains => {
                    assert.isNotOk(contains);
                    return bloomfilter.put(it);
                });
        });
        await Promise.all(promises);
    });


});
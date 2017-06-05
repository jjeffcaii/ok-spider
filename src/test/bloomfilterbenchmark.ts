import * as _ from "lodash";
import BufferedBloomFilter from "../bloomfilter/buffered";

const bloomfilter = new BufferedBloomFilter();

const totals = 1000000;

async function test(): Promise<number> {
    let wrong = 0;
    for (let i = 0; i < totals; i++) {
        let s = 'test' + i;
        let yes = await bloomfilter.mayContain(s);
        if (yes) {
            wrong++;
        }
        await bloomfilter.put(s);
        yes = await bloomfilter.mayContain(s);
        if (!yes) {
            wrong++;
        }
    }
    return wrong;
}

let start = _.now();

test().then(wrong => {
    let cost = _.now() - start;
    console.log('ops: %d', totals * 1000 / cost);
    console.log('right rate: %d%', 100 * (totals - wrong) / totals);
});

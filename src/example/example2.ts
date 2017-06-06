import {Spider, SpiderOptions} from "../core/spider";
import {Item, XResponse} from "../api";
import StandardResponse from "../response/standard";
import PrintPipeline from "../pipeline/print";
import * as _ from "lodash";
import UserAgentMiddleware from "../middleware/useragent";
import RequestLimitMiddleware from "../middleware/limit";
import * as Debug from "debug";
import DuplicateRemovePipeline from "../pipeline/duplicate";
import RetryMiddleware from "../middleware/retry";
import FileDownloaderPipeline, {DownloadInfo} from "../pipeline/filedownloader";
import {getSuffix} from "../utils/x";
import LimitPipeline from "../pipeline/limit";
import {builder} from "../index";

const debug = Debug('example.2');

/*
const memwatch = require('memwatch-ng');
const heapdump = require('heapdump');

memwatch.on('leak', function (info) {
    console.error(info);
    let file = process.env.HOME + '/spider-' + process.pid + '-' + Date.now() + '.heapsnapshot';
    heapdump.writeSnapshot(file, function (err) {
        if (err) console.error(err);
        else console.error('Wrote snapshot: ' + file);
    });
});
*/

interface CartoonItem extends Item {
    name: string;
    chapter: number;
    page: number;
}

class CartoonSpider extends Spider<CartoonItem> {

    parse(response: XResponse) {
        debug('==> %s', response.source);
        let selector = (response as StandardResponse).selector();
        this.next(selector.jquery('div.round li a').attr('href').extract(), response.source);
        let subpages = selector.jquery('#content li.pure-u-1-2 a').attr('href').extract();
        this.next(subpages, response.source);
        let img = selector.jquery('#mhpic').attr('src').extractFirst();
        if (!img) {
            return;
        }
        let h1 = selector.jquery('#mh h1').text().extractFirst();
        let names = /^([\u4e00-\u9fa5_a-zA-Z]+)(\d+)话?$/.exec(h1);
        if (!names) {
            return;
        }
        if (img.startsWith('//')) {
            img = 'http:' + img;
        }
        let name = names[1];
        if (name.endsWith('第')) {
            name = name.substring(0, name.length - 1);
        }
        let chapter = parseInt(names[2]);
        _.each(selector.jquery('#mhona').text().extract(), it => {
            let groups = /^第(\d+)页$/.exec(it);
            if (groups && groups.length > 1) {
                let item: CartoonItem = {
                    id: img,
                    name: name,
                    chapter: chapter,
                    page: parseInt(groups[1])
                };
                this.ok(item);
            }
        });
        let nexts = selector.jquery('#mh div.navigation a').attr('href').extract();
        _.each(nexts, it => {
            if (it !== './') {
                this.next(it, response.source);
            }
        });
    }
}

let options: SpiderOptions = {
    allowDomains: ['manhua.fzdm.com'],
    startUrls: ['http://manhua.fzdm.com/2', 'http://manhua.fzdm.com/132']
};

function pad(num: number): string {
    return _.padStart(String(num), 3, '0');
}

let downloadPipeline = new FileDownloaderPipeline<CartoonItem>(`${process.env.HOME}/okspider_cartoons`, t => {
    let suffix = getSuffix(t.id);
    let filename = `${t.name}/${pad(t.chapter)}/${pad(t.page)}${suffix}`;
    let info: DownloadInfo = {
        url: t.id,
        name: filename,
        overwrite: false
    };
    return [info];
});

let crawler = builder(new CartoonSpider('cartoon_spider', options))
    .middleware(new UserAgentMiddleware())
    .middleware(new RetryMiddleware(3))
    .middleware(new RequestLimitMiddleware(100))
    .pipeline(new DuplicateRemovePipeline<CartoonItem>())
    .pipeline(new PrintPipeline<CartoonItem>(true))
    .pipeline(new LimitPipeline<CartoonItem>(100))
    .pipeline(downloadPipeline)
    .build();
crawler.start();
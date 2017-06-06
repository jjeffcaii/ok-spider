import {Item} from "../api";
import {Spider, SpiderOptions} from "../core/spider";
import * as _ from "lodash";
import UserAgentMiddleware from "../middleware/useragent";
import {JsonFileExporter} from "../pipeline/exporter";
import FileDownloaderPipeline from "../pipeline/filedownloader";
import StandardResponse from "../response/standard";
import {getSuffix} from "../utils/x";
import DelayMiddleware from "../middleware/limit";
import RetryMiddleware from "../middleware/retry";
import {builder} from "../index";

interface Movie extends Item {
    magnets: string[];
    name: string;
    thumbnail: string;
}

class MovieSpider extends Spider<Movie> {

    constructor(name: string, options: SpiderOptions) {
        super(name, options);
        this.on(Spider.EVENT_ERROR, err => {
            console.error('spider process error: %s', err);
        });
    }

    parse(response: StandardResponse) {
        let selector = response.selector();
        let magnets = selector.jquery('a.d1').attr('href').extract();
        if (!_.isEmpty(magnets)) {
            let vod = selector.jquery('div.vod div.vod_img img').first();
            let thumbnail = vod.attr('src').extractFirst();
            let name = vod.attr('alt').extractFirst();
            this.ok({
                id: name,
                name: name,
                thumbnail: thumbnail,
                magnets: magnets
            });
        }

        let links = _.concat(
            selector.jquery('a.pic_link').attr('href').extract(),
            selector.jquery('div.pages a').attr('href').extract()
        );

        _(links)
            .map(url => {
                if (_.startsWith(url, '/')) {
                    return `http://www.btbtdy.com${url}`;
                } else {
                    return url;
                }
            })
            .each(it => this.next(it, response.source));
    }

}

let spider = new MovieSpider('movie_spider', {
    startUrls: 'http://www.btbtdy.com/btfl/dy1.html',
    allowDomains: 'www.btbtdy.com'
});

let home = process.env.HOME + '/spider-movie-warehouse';

let pipelineJson = new JsonFileExporter<Movie>(`${home}/results.json`);
let pipelineFileDownload = new FileDownloaderPipeline<Movie>(`${home}/thumbnails`, t => {
    return [{
        url: t.thumbnail,
        name: t.id + getSuffix(t.thumbnail)
    }];
});

let crawler = builder(spider)
    .middleware(new UserAgentMiddleware())
    .middleware(new DelayMiddleware(1000))
    .middleware(new RetryMiddleware(3))
    .pipeline(pipelineJson, pipelineFileDownload)
    .build();

crawler.start(() => {
    console.log('----------------------------------------------------');
    console.log('MOVIE CRAWLER START');
    console.log('----------------------------------------------------');
});
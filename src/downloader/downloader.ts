import {AbstractDownloader} from "./base";
import {Middleware, XRequest, XResponse} from "../api";
import StandardResponse from "../response/standard";
import * as request from "request";
import * as Debug from "debug";
const debug = Debug('downloader.downloader');

class DownloaderImpl extends AbstractDownloader {

    private timeout: number;

    constructor(middlewares?: Middleware<XRequest>[], timeout: number = 15000) {
        super(middlewares);
        this.timeout = timeout;
    }

    call(req: XRequest): Promise<XResponse> {
        let c = {
            timeout: this.timeout,
            headers: req.headers
        };
        let retry = req.retry || 1;
        return new Promise<XResponse>((resolve, reject) => {
            let fn = () => {
                request.get(req.url, c, (err, res, body) => {
                    if (!err) {
                        resolve(new StandardResponse(body, res.statusCode, req.url))
                    } else if (--retry > 0) {
                        debug('retry(%d) request: %s......', retry, req.url);
                        fn();
                    } else {
                        console.error('call request failed: url=%s, options=%j', req.url, c);
                        reject(err);
                    }
                });
            };
            fn();
        });
    }
}

export default DownloaderImpl;
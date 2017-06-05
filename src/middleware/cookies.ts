import {Middleware, XRequest} from "../api";
import {StringMap} from "../utils/alias";
import * as _ from "lodash";

class CookieMiddleware extends Middleware<XRequest> {

    protected cookies: StringMap<string>;

    constructor(cookies: StringMap<string>) {
        super();
        this.cookies = cookies;
    }

    async process(t: XRequest): Promise<void> {
        if (t.cookies) {
            t.cookies = _.extend({}, t.cookies, this.cookies);
        }
        this.publish(t);
    }

}

export default CookieMiddleware;
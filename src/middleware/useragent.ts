import {Middleware, XRequest} from "../api";
import {isNullOrUndefined} from "util";
import * as _ from "lodash";
import {PRESENT_AGENTS} from "../utils/x";

class UserAgentMiddleware extends Middleware<XRequest> {

    private agents: string[];

    constructor(agents?: string[]) {
        super();
        this.agents = agents ? _.cloneDeep(agents) : PRESENT_AGENTS;
    }

    async process(t: XRequest): Promise<void> {
        let i = (Math.random() * this.agents.length) >> 0;
        let ua = this.agents[i];
        if (isNullOrUndefined(t.headers)) {
            t.headers = {};
        }
        t.headers['User-Agent'] = ua;
        this.publish(t);
    }
}

export default UserAgentMiddleware;
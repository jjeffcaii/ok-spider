import {Middleware, XRequest} from "../api";

class RetryMiddleware extends Middleware<XRequest> {

    private retry: number;

    constructor(retry: number = 1) {
        super();
        this.retry = retry;
    }

    async process(t: XRequest): Promise<void> {
        t.retry = this.retry;
        this.publish(t);
    }

}

export default RetryMiddleware;
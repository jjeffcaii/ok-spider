import {XResponse} from "../api";
import JQuerySelector, {JQuery} from "../selector/jquery";

class SelectorSupport {

    private jquerySelector: JQuerySelector;

    constructor(response: XResponse) {
        this.jquerySelector = new JQuerySelector(response);
    }

    jquery(str: string): JQuery {
        return this.jquerySelector.$(str);
    }
}

class StandardResponse implements XResponse {

    readonly html: string;
    readonly status: number;
    readonly source?: string;

    constructor(html: string, status: number = 200, source?: string) {
        this.html = html;
        this.status = status;
        this.source = source;
    }

    isSuccessful(): boolean {
        return this.status >= 200 && this.status < 300;
    }

    selector(): SelectorSupport {
        return new SelectorSupport(this);
    }

}

export default StandardResponse;
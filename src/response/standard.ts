import {XResponse} from "../api";
import JQuerySelector, {JQuery} from "../selector/jquery";
import XPathSelector, {XPath} from "../selector/xpath";


class SelectorSupport {

    private jquerySelector: JQuerySelector;
    private xpathSelector: XPathSelector;

    constructor(response: XResponse) {
        this.jquerySelector = new JQuerySelector(response);
        this.xpathSelector = new XPathSelector(response);
    }

    jquery(str: string): JQuery {
        return this.jquerySelector.$(str);
    }

    xpath(str: string): XPath {
        return this.xpathSelector.xpath(str);
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
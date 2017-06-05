import {AbstractSelector, XResponse} from "../api";
import * as libxmljs from "libxmljs";
import {isArray} from "util";
import * as _ from "lodash";

class XPath {

    private element: libxmljs.Element | libxmljs.Element[];

    constructor(element: libxmljs.Element) {
        this.element = element;
    }

    extract(): string[] {
        if (!this.element) {
            return undefined;
        }
        if (isArray(this.element)) {
            let elements = this.element as libxmljs.Element[];
            return _.map(elements, it => it.toString());
        } else {
            return [(this.element as libxmljs.Element).toString()];
        }
    }

}


class XPathSelector extends AbstractSelector<string> {

    private doc: libxmljs.HTMLDocument;

    constructor(response: XResponse) {
        super(response);
        this.doc = libxmljs.parseHtml(response.html);
    }

    xpath(str: string): XPath {
        return new XPath(this.doc.get(str));
    }

    extract(): string[] {
        return [this.doc.toString()];
    }

}

export {XPath}
export default XPathSelector;
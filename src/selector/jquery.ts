import * as cheerio from "cheerio";
import {AbstractSelector, Selector, XResponse} from "../api";
import * as _ from "lodash";


class JQuery {

    private selector: Cheerio;

    constructor(dom: CheerioStatic, ...selects: string[]) {
        this.selector = (dom as Function)(...selects);
    }

    last(): JQuery {
        this.selector = this.selector.last();
        return this;
    }

    first(): JQuery {
        this.selector = this.selector.first();
        return this;
    }

    text(): Selector<string> {
        let fn = () => {
            return this.selector.map((index, element) => cheerio(element).text()).get();
        };
        return {
            extract: fn,
            extractFirst: () => _.first(fn())
        };
    }

    html(): Selector<string> {
        let fn = () => {
            return this.selector.map((index, element) => cheerio(element).html()).get();
        };
        return {
            extract: fn,
            extractFirst: () => _.first(fn())
        };
    }

    value(): Selector<string> {
        let fn = () => {
            return this.selector.map((index, element) => cheerio(element).val()).get();
        };
        return {
            extract: fn,
            extractFirst: () => _.first(fn())
        };
    }

    attr(name: string): Selector<string> {
        let fn = () => {
            return this.selector.map((index, element) => cheerio(element).attr(name)).get();
        };
        return {
            extract: fn,
            extractFirst: () => _.first(fn())
        };
    }

}

class JQuerySelector extends AbstractSelector<String> {

    protected dom: CheerioStatic;

    constructor(response: XResponse) {
        super(response);
        this.dom = cheerio.load(response.html);
    }

    $(...args: string[]): JQuery {
        return new JQuery(this.dom, ...args);
    }

    extract(): string[] {
        return [this.response.html];
    }
}

export {JQuery};
export default JQuerySelector;
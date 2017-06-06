import {Item} from "./api";
import {Spider} from "./core/spider";
import {Builder} from "./core/crawler";

function builder<T extends Item>(spider: Spider<T>): Builder<T> {
    return new Builder<T>(spider);
}

export {
    builder
}
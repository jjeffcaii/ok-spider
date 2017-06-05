import {normalize} from "../utils/x";
import {assert} from "chai";

describe('URL Test', () => {
    it('#test1', done => {
        let s = normalize('a/b/c/d/../foobar.js?a=1&b=2#H1', 'http://baidu.com/users?id=2');
        assert.equal(s, 'http://baidu.com/users/a/b/c/foobar.js?a=1&b=2');
        s = normalize('//a/b/c/d/../foobar.js', 'http://baidu.com/users?id=2');
        assert.equal(s, 'http://baidu.com/a/b/c/foobar.js');
        done();
    });
});
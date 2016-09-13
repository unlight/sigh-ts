import test from "ava";
import { Bacon } from "sigh-core";
import Event from "sigh-core/lib/Event";
import lib from "..";
import ProcessPool from "process-pool";
import _ from "lodash";

test.beforeEach(t => {
    var event = new Event({
        basePath: "root",
        path: "dir/file.ts",
        type: "add",
        data: "export enum Hello {WORLD = 1}"
    });
    t.context.event = event;
    t.context.stream = Bacon.constant([event]);
    t.context.procPool = new ProcessPool();
});

test.afterEach(t => {
    t.context.procPool.destroy();
});

test("smoke test", t => {
    t.truthy(lib);
});

test("options", t => {
    var op = { stream: t.context.stream, procPool: t.context.procPool };
    var options = { target: "es6", "module": "es2015", reportDiagnostics: true };
    return lib(op, options).toPromise().then(events => {
        var data = _.get(events, "0.data");
        t.truthy(data.indexOf('export var Hello') !== -1);
    });
});

test("declaration", t => {
    var op = {
        stream: Bacon.constant([
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "add",
                data: "class A {}"
            })
        ]),
        procPool: t.context.procPool
    };
    var options = { target: "es5", "module": "commonjs", reportDiagnostics: true, declaration: true, sourceMap: true };
    return lib(op, options).toPromise().then(events => {
        var data = _.get(events, "0.data");
        var definition = _.get(events, "1.data");
        t.is(events.length, 2);
        t.truthy(definition.indexOf("declare class A") !== -1);
    });
});


test("log errors", t => {
    var op = {
        stream: Bacon.constant([
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "add",
                data: "class A extends B {}"
            })
        ]),
        procPool: t.context.procPool
    };
    var options = { target: "es5", "module": "commonjs", reportDiagnostics: true, declaration: false, sourceMap: false };
    return lib(op, options).toPromise().then(events => {
        var data = _.get(events, "0.data");
    });
});

test("remove event and declaration", t => {
    var op = {
        stream: Bacon.constant([
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "add",
                data: "class A {}"
            }),
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "remove",
                data: "class A {}"
            })
        ]),
        procPool: t.context.procPool
    };
    var options = { target: "es5", "module": "commonjs", reportDiagnostics: true, declaration: true, sourceMap: true };
    return lib(op, options).toPromise().then(events => {
        var removed = _.find(events, event => event.path === "dir/file.d.ts");
        t.truthy(removed);
    });
});

test("module resolution node", t => {
    var op = {
        stream: Bacon.constant([
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "add",
                data: "class A {}"
            })
        ]),
        procPool: t.context.procPool
    };
    var options = { target: "es5", "module": "commonjs", moduleResolution: "node" };
    return lib(op, options).toPromise().then(events => {
        var data = _.get(events, "0.data");
    });
});

test("suffix should be js", t => {
    var op = {
        stream: Bacon.constant([
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "add",
                data: "class A {}"
            })
        ]),
        procPool: t.context.procPool
    };
    var options = { target: "es5", "module": "commonjs", moduleResolution: "node" };
    return lib(op, options).toPromise().then(events => {
        var [event1] = events;
        t.true(_.endsWith(event1.path, ".js"));
    });
});

test("typings definitions should be used", t => {
    var op = {
        stream: Bacon.constant([
            new Event({
                basePath: "root",
                path: "dir/file.ts",
                type: "add",
                data: "import * as fs from 'fs'; console.log(fs);"
            })
        ]),
        procPool: t.context.procPool
    };
    var options = { target: "es5", "module": "commonjs", moduleResolution: "node" };
    options.logd = function(messageList) {
        var text = _.get(messageList, '0.messageText');
        if (text) t.fail(text);
    };
    return lib(op, options).toPromise().then(events => {
        var [event1] = events;
        t.pass();
    });
});
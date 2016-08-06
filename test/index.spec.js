import test from "ava";
import { Bacon } from "sigh-core";
import Event from "sigh-core/lib/Event";
import lib from "..";
import ProcessPool from "process-pool";
import {get} from "lodash";

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
        var data = get(events, "0.data");
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
        var data = get(events, "0.data");
        var definition = get(events, "1.data");
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
        var data = get(events, "0.data");
    });
});

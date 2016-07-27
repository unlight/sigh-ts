import test from "ava";
import { Bacon } from "sigh-core";
import Event from "sigh-core/lib/Event";
import lib from "..";
import ProcessPool from "process-pool";
import {get} from "lodash";

test.beforeEach(t => {
	var data = "export enum Hello {WORLD = 1}";
	var event = new Event({
		basePath: "root",
		path: "root/subdir/file.ts",
		type: "add",
		data
	});
	t.context.event = event;
	t.context.data = data;
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
	var op = {stream: t.context.stream, procPool: t.context.procPool};
	var options = {target: "es6", "module": "es2015", reportDiagnostics: true};
	return lib(op, options).toPromise().then(events => {
		var data = get(events, "0.data");
		t.truthy(data.indexOf('export var Hello') !== -1);
	});
});

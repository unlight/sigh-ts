import {pick} from "lodash";
import {mapEvents} from "sigh-core/lib/stream";

function task(options) {
	// this function is called once for each subprocess in order to cache state,
	// it is not a closure and does not have access to the surrounding state, use
	// `require` to include any modules you need, for further info see
	// https://github.com/ohjames/process-pool
	var log = require("sigh-core").log;
	var typescript = require("typescript");

	var compilerOptions = {
		sourceMap: true,
		module: typescript.ModuleKind.CommonJS
	};

	// this task runs inside the subprocess to transform each event
	return event => {
		var result = typescript.transpileModule(event.data, {
			compilerOptions: compilerOptions,
			fileName: event.path
		});
		var {outputText: data, sourceMapText: sourceMap} = result;
		return {data, sourceMap};
	};
}

function adaptEvent(compiler) {
	// data sent to/received from the subprocess has to be serialised/deserialised
	return event => {
		if (event.type !== "add" && event.type !== "change") return event;
		if (event.fileType !== "ts") return event;

		return compiler(pick(event, "type", "data", "path", "projectPath")).then(result => {
			event.data = result.data;
			if (result.sourceMap) {
				event.applySourceMap(JSON.parse(result.sourceMap));
			}
			event.changeFileSuffix("js");
			return event;
		});
	};
}

var pooledProc;

export default function(op, options = {}) {
	if (!pooledProc) {
		pooledProc = op.procPool.prepare(task, options, {module});
	}
	return mapEvents(op.stream, adaptEvent(pooledProc));
};
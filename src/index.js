import {pick, assign, get} from "lodash";
import {mapEvents} from "sigh-core/lib/stream";
import {existsSync, readFileSync} from "fs";

function task(options) {
	// This function is called once for each subprocess in order to cache state,
	// it is not a closure and does not have access to the surrounding state, use
	// `require` to include any modules you need, for further info see
	// https://github.com/ohjames/process-pool
	// var log = require("sigh-core").log;
	var typescript = require("typescript");
	var _ = require("lodash");

	options.sourceMap = true;

	if (options.target) {
		var scriptTarget = options.target.toUpperCase();
		options.target = _(typescript.ScriptTarget).find((value, key) => String(key).toUpperCase() === scriptTarget);
	}

	if (options.module) {
		var moduleKind = options.module.toUpperCase();
		options.module = _(typescript.ModuleKind).find((value, key) => String(key).toUpperCase() === moduleKind);
	}

	// This task runs inside the subprocess to transform each event
	return event => {
		var result = typescript.transpileModule(event.data, {
			compilerOptions: options,
			fileName: event.path
		});
		return {
			data: result.outputText,
			sourceMap: result.sourceMapText
		};
	};
}

var proc;

export default function(op, options = {}) {
	if (!proc) {
		if (existsSync("tsconfig.json")) {
			var tsconfig = require("./tsconfig.json");
			var compilerOptions = get(tsconfig, 'compilerOptions', {});
			options = assign({}, compilerOptions, options)
		}
		proc = op.procPool.prepare(task, options, {module});
	}
	
	return mapEvents(op.stream, event => {
		// Data sent to/received from the subprocess has to be serialised/deserialised
		if (!(event.type === "add" || event.type === "change")) return event;
		if (!(event.fileType === "ts" || event.fileType === "tsx")) return event;

		return proc(pick(event, "type", "data", "path", "projectPath")).then(result => {
			event.data = result.data;
			event.sourceMap = JSON.parse(result.sourceMap);
			event.changeFileSuffix("js");
			return event;
		});
	});
}
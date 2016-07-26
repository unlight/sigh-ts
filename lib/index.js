"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

exports.default = function (op) {
	var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	if (!proc) {
		var rootDirectory = _pkgDir2.default.sync();
		var tsconfigFile = rootDirectory + "/tsconfig.json";
		if ((0, _fs.existsSync)(tsconfigFile)) {
			var tsconfig = require(tsconfigFile);
			var compilerOptions = (0, _lodash.get)(tsconfig, 'compilerOptions', {});
			options = (0, _lodash.assign)({}, compilerOptions, options);
		}
		proc = op.procPool.prepare(task, options, { module: module });
	}

	return (0, _stream.mapEvents)(op.stream, function (event) {
		// Data sent to/received from the subprocess has to be serialised/deserialised
		if (!(event.type === "add" || event.type === "change")) return event;
		if (!(event.fileType === "ts" || event.fileType === "tsx")) return event;

		return proc((0, _lodash.pick)(event, "type", "data", "path", "projectPath")).then(function (result) {
			event.data = result.data;
			event.sourceMap = JSON.parse(result.sourceMap);
			event.changeFileSuffix("js");
			return event;
		});
	});
};

var _lodash = require("lodash");

var _stream = require("sigh-core/lib/stream");

var _fs = require("fs");

var _pkgDir = require("pkg-dir");

var _pkgDir2 = _interopRequireDefault(_pkgDir);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
		options.target = _(typescript.ScriptTarget).find(function (value, key) {
			return String(key).toUpperCase() === scriptTarget;
		});
	}

	if (options.module) {
		var moduleKind = options.module.toUpperCase();
		options.module = _(typescript.ModuleKind).find(function (value, key) {
			return String(key).toUpperCase() === moduleKind;
		});
	}

	// This task runs inside the subprocess to transform each event
	return function (event) {
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

module.exports = exports["default"];
//# sourceMappingURL=index.js.map
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (op) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    if (!proc) {
        var compilerOptions = {};
        var tsconfigFile = pkgDir.sync() + "/tsconfig.json";
        if ((0, _fs.existsSync)(tsconfigFile)) {
            var tsconfig = require(tsconfigFile);
            compilerOptions = _.get(tsconfig, "compilerOptions", {});
        }
        options = _.assign({ sourceMap: true }, compilerOptions, options);
        if (options.target) {
            options.target = getEnumOption(ts.ScriptTarget, options.target);
        }
        if (options.module) {
            options.module = getEnumOption(ts.ModuleKind, options.module);
        }
        // console.log(JSON.stringify(options));
        proc = op.procPool.prepare(task, options, { module: module });
    }

    return (0, _stream.mapEvents)(op.stream, function (event) {
        // Data sent to/received from the subprocess has to be serialised/deserialised
        if (!(event.type === "add" || event.type === "change")) return event;
        if (!(event.fileType === "ts" || event.fileType === "tsx")) return event;

        return proc(_.pick(event, "type", "data", "path", "projectPath")).then(function (result) {
            event.changeFileSuffix("js");
            event.data = result.outputText;
            if (result.diagnostics) {
                result.diagnostics.forEach(function (d) {
                    // Warning = 0, Error = 1, Message = 2.
                    if (d.category === 0 || d.category === 1) {
                        _sighCore.log.warn((d.messageText + " " + (d.file || "") + " " + (d.start || "") + " " + (d.length || "")).trim());
                    } else {
                        (0, _sighCore.log)(d.messageText);
                    }
                });
            }
            if (result.sourceMapText) {
                event.sourceMap = JSON.parse(result.sourceMapText);
            }
            return event;
        });
    });
};

var _stream = require("sigh-core/lib/stream");

var _sighCore = require("sigh-core");

var _fs = require("fs");

var pkgDir = require("pkg-dir");
var ts = require("typescript");
var _ = require("lodash");
var proc;

function task(options) {
    // This function is called once for each subprocess in order to cache state,
    // it is not a closure and does not have access to the surrounding state, use
    // `require` to include any modules you need, for further info see
    // https://github.com/ohjames/process-pool
    var typescript = require("typescript");
    var _options$reportDiagno = options.reportDiagnostics;
    var reportDiagnostics = _options$reportDiagno === undefined ? false : _options$reportDiagno;

    // This task runs inside the subprocess to transform each event

    return function (event) {
        return typescript.transpileModule(event.data, {
            compilerOptions: options,
            fileName: event.path,
            reportDiagnostics: reportDiagnostics
        });
    };
}

function getEnumOption(collection, value) {
    var valueUpper = String(value).toLocaleUpperCase();
    return _.chain(collection).findKey(function (value) {
        return String(value).toUpperCase() === valueUpper;
    }).toNumber().value();
}

module.exports = exports["default"];
//# sourceMappingURL=index.js.map
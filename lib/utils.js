"use strict";
var ts = require("typescript");
var fs_1 = require("fs");
var _ = require("lodash");
var log = require("sigh-core").log;
function logDiagnostics(diagnostics) {
    diagnostics.forEach(function (d) {
        var message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            var _a = d.file.getLineAndCharacterOfPosition(d.start), line = _a.line, character = _a.character;
            var lineText = d.file.fileName + ":" + (line + 1) + ":" + (character + 1);
            message = lineText + " " + message;
        }
        message = message.trim();
        if (d.category === 0 || d.category === 1) {
            log.warn(message);
        }
        else {
            log(message);
        }
    });
}
exports.logDiagnostics = logDiagnostics;
function getCompilerOptions(tsconfigFile, options) {
    if (options === void 0) { options = {}; }
    if (fs_1.existsSync(tsconfigFile)) {
        var tsconfig = require(tsconfigFile);
        options = _.assign({}, _.get(tsconfig, "compilerOptions", {}), options);
    }
    if (options.target) {
        options.target = getEnumOption(ts.ScriptTarget, options.target);
    }
    if (options.module) {
        options.module = getEnumOption(ts.ModuleKind, options.module);
    }
    if (options.moduleResolution) {
        if (String(options.moduleResolution).toLocaleLowerCase() === "node") {
            options.moduleResolution = ts.ModuleResolutionKind.NodeJs;
        }
        options.moduleResolution = getEnumOption(ts.ModuleResolutionKind, options.moduleResolution);
    }
    if (options.inlineSourceMap || options.sourceMap) {
        options.inlineSources = true;
    }
    return options;
}
exports.getCompilerOptions = getCompilerOptions;
function getEnumOption(collection, value) {
    var valueUpper = String(value).toLocaleUpperCase();
    var result = _.chain(collection)
        .findKey(function (value) { return String(value).toUpperCase() === valueUpper; })
        .toNumber()
        .value();
    if (_.isNaN(result)) {
        result = value;
    }
    return result;
}
exports.getEnumOption = getEnumOption;
function parseOutputFiles(outputFiles) {
    var jsFile = _.find(outputFiles, function (f) { return _.endsWith(f.name, ".js"); });
    var mapFile = _.find(outputFiles, function (f) { return _.endsWith(f.name, ".js.map"); });
    var dtsFile = _.find(outputFiles, function (f) { return _.endsWith(f.name, ".d.ts"); });
    return { jsFile: jsFile, mapFile: mapFile, dtsFile: dtsFile };
}
exports.parseOutputFiles = parseOutputFiles;
//# sourceMappingURL=utils.js.map
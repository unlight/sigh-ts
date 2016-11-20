"use strict";
var ts = require("typescript");
var fs_1 = require("fs");
var _ = require("lodash");
var Path = require("path");
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
var tsVersion = parseFloat(ts.version);
function createLanguageService(_a) {
    var files = _a.files, tsconfigFile = _a.tsconfigFile, compilerOptions = _a.compilerOptions, typingsIndex = _a.typingsIndex;
    compilerOptions = getCompilerOptions(tsconfigFile, compilerOptions);
    var logd = _.get(compilerOptions, "logd", logDiagnostics);
    var _existsSync = _.memoize(fs_1.existsSync);
    var _readFileSync = _.memoize(fs_1.readFileSync);
    // Create the language service host to allow the LS to communicate with the host.
    var servicesHost = {
        getScriptFileNames: function () { return [typingsIndex].concat(Object.keys(files)); },
        getScriptVersion: function (filepath) { return files[filepath] && files[filepath].version.toString(); },
        getScriptSnapshot: function (filepath) {
            var data;
            if (files[filepath]) {
                data = files[filepath].data;
                return ts.ScriptSnapshot.fromString(data);
            }
            if (!_existsSync(filepath) && filepath.indexOf('node_modules/typescript/lib') !== -1 && tsVersion >= 2) {
                var basename = Path.basename(filepath);
                filepath = Path.dirname(filepath) + "/lib." + basename;
            }
            // TODO: Too slow. Read package.json and restrict finding.
            if (!_existsSync(filepath)) {
                return undefined;
            }
            data = _readFileSync(filepath).toString();
            return ts.ScriptSnapshot.fromString(data);
        },
        getCurrentDirectory: _.constant(process.cwd()),
        getCompilationSettings: _.constant(compilerOptions),
        getDefaultLibFileName: function (options) { return ts.getDefaultLibFilePath(options); },
    };
    // Create the language service files.
    return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}
exports.createLanguageService = createLanguageService;
//# sourceMappingURL=utils.js.map
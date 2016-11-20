"use strict";
var _a = require("sigh-core"), log = _a.log, Event = _a.Event;
var fs_1 = require("fs");
var Path = require("path");
var pkgDir = require("pkg-dir");
var ts = require("typescript");
var _ = require("lodash");
var utils = require("./utils");
var file_info_1 = require("./file-info");
var npmPackage = pkgDir.sync();
var typingsIndex = Path.resolve(npmPackage, "typings/index.d.ts");
function default_1(op, compilerOptions) {
    if (compilerOptions === void 0) { compilerOptions = {}; }
    var tsconfigFile = Path.join(npmPackage, "tsconfig.json");
    compilerOptions = utils.getCompilerOptions(tsconfigFile, compilerOptions);
    var logd = _.get(compilerOptions, "logd", utils.logDiagnostics);
    var files = {};
    var _existsSync = _.memoize(fs_1.existsSync);
    var _readFileSync = _.memoize(fs_1.readFileSync);
    // Create the language service host to allow the LS to communicate with the host
    var servicesHost = {
        getScriptFileNames: function () { return [typingsIndex].concat(Object.keys(files)); },
        getScriptVersion: function (filepath) { return files[filepath] && files[filepath].version.toString(); },
        getScriptSnapshot: function (filepath) {
            var data;
            if (files[filepath]) {
                data = files[filepath].data;
                return ts.ScriptSnapshot.fromString(data);
            }
            if (!_existsSync(filepath) && filepath.indexOf('node_modules/typescript/lib') !== -1 && parseFloat(ts.version) >= 2) {
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
    // Create the language service files
    var service = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
    logd(service.getCompilerOptionsDiagnostics());
    function eventCallback(event, index, events) {
        var eventPath = event.path;
        var info = files[eventPath];
        switch (event.type) {
            case "add":
            case "change":
                if (!info) {
                    info = new file_info_1.FileInfo({ version: 0, data: "", dtsFile: null });
                    files[eventPath] = info;
                }
                info.version++;
                info.data = event.data;
                var _a = service.getEmitOutput(eventPath), outputFiles = _a.outputFiles, emitSkipped = _a.emitSkipped;
                var _b = utils.parseOutputFiles(outputFiles), jsFile = _b.jsFile, mapFile = _b.mapFile, dtsFile = _b.dtsFile;
                event.data = jsFile.text;
                event.changeFileSuffix("js");
                if (mapFile) {
                    event.applySourceMap(JSON.parse(mapFile.text));
                }
                if (dtsFile) {
                    var fields = _.pick(event, ["type", "basePath", "data", "path"]);
                    fields.data = dtsFile.text;
                    var newEvent = new Event(fields);
                    newEvent.changeFileSuffix("d.ts");
                    events.push(newEvent);
                    info.dtsFile = newEvent.path;
                }
                // Log diagnostics.
                var diagnostics = []
                    .concat(service.getSyntacticDiagnostics(eventPath))
                    .concat(service.getSemanticDiagnostics(eventPath));
                logd(diagnostics);
                // Log fatal error.
                if (emitSkipped) {
                    log.warn("Emit of " + eventPath + " failed (fatal errors).");
                }
                break;
            case "remove":
                if (info && info.dtsFile) {
                    var dtsFileEvent = _.find(events, function (event) { return event.path === info.dtsFile; });
                    if (dtsFileEvent) {
                        dtsFileEvent.type = "remove";
                    }
                }
                delete files[eventPath];
                break;
        }
        return event;
    }
    return op.stream.map(function (events) {
        _.each(events, eventCallback);
        return events;
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
module.exports = exports["default"];
//# sourceMappingURL=index.js.map
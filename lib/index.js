"use strict";
var _a = require("sigh-core"), log = _a.log, Event = _a.Event;
var Path = require("path");
var pkgDir = require("pkg-dir");
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
    var service = utils.createLanguageService({ files: files, tsconfigFile: tsconfigFile, compilerOptions: compilerOptions, typingsIndex: typingsIndex });
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
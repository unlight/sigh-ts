"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _toConsumableArray2 = require("babel-runtime/helpers/toConsumableArray");

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

exports.default = function (op) {
    var compilerOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    compilerOptions = getCompilerOptions(compilerOptions);
    var logd = _lodash2.default.get(compilerOptions, "logd", _logdiagnostics2.default);
    var files = {};
    var _existsSync = _lodash2.default.memoize(_fs.existsSync);
    var _readFileSync = _lodash2.default.memoize(_fs.readFileSync);
    // Create the language service host to allow the LS to communicate with the host
    var servicesHost = {
        getScriptFileNames: function getScriptFileNames() {
            return [typingsIndex].concat((0, _toConsumableArray3.default)((0, _keys2.default)(files)));
        },
        getScriptVersion: function getScriptVersion(filepath) {
            return files[filepath] && files[filepath].version.toString();
        },
        getScriptSnapshot: function getScriptSnapshot(filepath) {
            var data;
            if (files[filepath]) {
                data = files[filepath].data;
                return _typescript2.default.ScriptSnapshot.fromString(data);
            }
            if (!_existsSync(filepath) && filepath.indexOf('node_modules/typescript/lib') !== -1 && parseFloat(_typescript2.default.version) >= 2) {
                var basename = path.basename(filepath);
                filepath = path.dirname(filepath) + "/lib." + basename;
            }
            // TODO: Too slow. Read package.json and restrict finding.
            if (!_existsSync(filepath)) {
                return undefined;
            }
            data = _readFileSync(filepath).toString();
            return _typescript2.default.ScriptSnapshot.fromString(data);
        },
        getCurrentDirectory: _lodash2.default.constant(process.cwd()),
        getCompilationSettings: _lodash2.default.constant(compilerOptions),
        getDefaultLibFileName: function getDefaultLibFileName(options) {
            return _typescript2.default.getDefaultLibFilePath(options);
        }
    };
    // Create the language service files
    var service = _typescript2.default.createLanguageService(servicesHost, _typescript2.default.createDocumentRegistry());

    logd(service.getCompilerOptionsDiagnostics());

    function eventCallback(event, index, events) {
        var eventPath = event.path;
        switch (event.type) {
            case "add":
            case "change":
                var info = files[eventPath];
                if (!info) {
                    info = { version: 0, data: "", dtsFile: null };
                    files[eventPath] = info;
                }
                info.version++;
                info.data = event.data;

                var _service$getEmitOutpu = service.getEmitOutput(eventPath),
                    outputFiles = _service$getEmitOutpu.outputFiles,
                    emitSkipped = _service$getEmitOutpu.emitSkipped;

                var _parseOutputFiles = parseOutputFiles(outputFiles),
                    jsFile = _parseOutputFiles.jsFile,
                    mapFile = _parseOutputFiles.mapFile,
                    dtsFile = _parseOutputFiles.dtsFile;

                event.data = jsFile.text;
                event.changeFileSuffix("js");
                if (mapFile) {
                    event.applySourceMap(JSON.parse(mapFile.text));
                }
                if (dtsFile) {
                    var fields = _lodash2.default.pick(event, ["type", "basePath", "data", "path"]);
                    fields.data = dtsFile.text;
                    var newEvent = new _sighCore.Event(fields);
                    newEvent.changeFileSuffix("d.ts");
                    events.push(newEvent);
                    info.dtsFile = newEvent.path;
                }
                // Log diagnostics.
                var diagnostics = [].concat(service.getSyntacticDiagnostics(eventPath)).concat(service.getSemanticDiagnostics(eventPath));
                logd(diagnostics);
                // Log fatal error.
                if (emitSkipped) {
                    _sighCore.log.warn("Emit of " + eventPath + " failed (fatal errors).");
                }
                break;
            case "remove":
                var dtsFile = _lodash2.default.get(info, "dtsFile");
                if (dtsFile) {
                    var dtsFileEvent = _lodash2.default.find(events, function (event) {
                        return event.path === dtsFile;
                    });
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
        _lodash2.default.each(events, eventCallback);
        return events;
    });
};

var _sighCore = require("sigh-core");

var _fs = require("fs");

var _path = require("path");

var path = _interopRequireWildcard(_path);

var _pkgDir = require("pkg-dir");

var _pkgDir2 = _interopRequireDefault(_pkgDir);

var _typescript = require("typescript");

var _typescript2 = _interopRequireDefault(_typescript);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _logdiagnostics = require("./logdiagnostics");

var _logdiagnostics2 = _interopRequireDefault(_logdiagnostics);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var npmPackage = _pkgDir2.default.sync();
var typingsIndex = path.resolve(npmPackage, "typings/index.d.ts");

function parseOutputFiles(outputFiles) {
    var jsFile = _lodash2.default.find(outputFiles, function (f) {
        return _lodash2.default.endsWith(f.name, ".js");
    });
    var mapFile = _lodash2.default.find(outputFiles, function (f) {
        return _lodash2.default.endsWith(f.name, ".js.map");
    });
    var dtsFile = _lodash2.default.find(outputFiles, function (f) {
        return _lodash2.default.endsWith(f.name, ".d.ts");
    });
    return { jsFile: jsFile, mapFile: mapFile, dtsFile: dtsFile };
}

function getCompilerOptions() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var tsconfigFile = path.join(npmPackage, "tsconfig.json");
    if ((0, _fs.existsSync)(tsconfigFile)) {
        var tsconfig = require(tsconfigFile);
        options = _lodash2.default.assign({}, _lodash2.default.get(tsconfig, "compilerOptions", {}), options);
    }
    if (options.target) {
        options.target = getEnumOption(_typescript2.default.ScriptTarget, options.target);
    }
    if (options.module) {
        options.module = getEnumOption(_typescript2.default.ModuleKind, options.module);
    }
    if (options.moduleResolution) {
        if (String(options.moduleResolution).toLocaleLowerCase() === "node") {
            options.moduleResolution = "NodeJs";
        }
        options.moduleResolution = getEnumOption(_typescript2.default.ModuleResolutionKind, options.moduleResolution);
    }
    if (options.inlineSourceMap || options.sourceMap) {
        options.inlineSources = true;
    }
    return options;
}

function getEnumOption(collection, value) {
    var valueUpper = String(value).toLocaleUpperCase();
    var result = _lodash2.default.chain(collection).findKey(function (value) {
        return String(value).toUpperCase() === valueUpper;
    }).toNumber().value();
    if (_lodash2.default.isNaN(result)) {
        result = value;
    }
    return result;
}

module.exports = exports["default"];
//# sourceMappingURL=index.js.map
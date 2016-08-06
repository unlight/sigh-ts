"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (op) {
    var compilerOptions = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    compilerOptions = getCompilerOptions(compilerOptions);
    var files = {};
    // Create the language service host to allow the LS to communicate with the host
    var servicesHost = {
        getScriptFileNames: function getScriptFileNames() {
            return _lodash2.default.keys(files);
        },
        getScriptVersion: function getScriptVersion(filepath) {
            return files[filepath] && files[filepath].version.toString();
        },
        getScriptSnapshot: function getScriptSnapshot(filepath) {
            var data = "";
            if (files[filepath]) {
                data = files[filepath].data;
            } else {
                if (!(0, _fs.existsSync)(filepath)) return undefined;
                data = (0, _fs.readFileSync)(filepath).toString();
            }
            return _typescript2.default.ScriptSnapshot.fromString(data);
        },
        getCurrentDirectory: _lodash2.default.constant(process.cwd()),
        getCompilationSettings: _lodash2.default.constant(compilerOptions),
        getDefaultLibFileName: function getDefaultLibFileName(options) {
            return _typescript2.default.getDefaultLibFilePath(options);
        }
    };
    // Create the language service files
    var services = _typescript2.default.createLanguageService(servicesHost, _typescript2.default.createDocumentRegistry());

    logDiagnostics(services.getCompilerOptionsDiagnostics());

    function eventCallback(event, index, events) {
        switch (event.type) {
            case "add":
                files[event.path] = {};
                files[event.path].version = 0;
                files[event.path].data = event.data;
                break;
            case "change":
                files[event.path].version++;
                files[event.path].data = event.data;
                break;
            case "remove":
                delete files[event.path];
                break;
        }
        if (event.type === "add" || event.type === "change") {
            var _services$getEmitOutp = services.getEmitOutput(event.path);

            var outputFiles = _services$getEmitOutp.outputFiles;
            var emitSkipped = _services$getEmitOutp.emitSkipped;

            for (var i = 0; i < outputFiles.length; i++) {
                var outfile = outputFiles[i];
                if (_lodash2.default.endsWith(outfile.name, ".js")) {
                    event.data = outfile.text;
                } else if (_lodash2.default.endsWith(outfile.name, ".js.map")) {
                    event.applySourceMap(JSON.parse(outfile.text));
                } else if (_lodash2.default.endsWith(outfile.name, ".d.ts")) {
                    var fields = _lodash2.default.pick(event, ["type", "basePath", "data", "path"]);
                    fields.data = outfile.text;
                    var newEvent = new _sighCore.Event(fields);
                    newEvent.changeFileSuffix("d.ts");
                    events.push(newEvent);
                }
            }
            // Log diagnostics.
            var diagnostics = [].concat(services.getSyntacticDiagnostics(event.path)).concat(services.getSemanticDiagnostics(event.path));

            logDiagnostics(diagnostics);

            if (emitSkipped) {
                _sighCore.log.warn("Emit of " + event.path + " failed (fatal errors).");
            }
        }
        return event;
    }

    return op.stream.map(function (events) {
        _lodash2.default.each(events, eventCallback);
        return events;
    });
};

var _stream = require("sigh-core/lib/stream");

var _sighCore = require("sigh-core");

var _fs = require("fs");

var _pkgDir = require("pkg-dir");

var _pkgDir2 = _interopRequireDefault(_pkgDir);

var _typescript = require("typescript");

var _typescript2 = _interopRequireDefault(_typescript);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function logDiagnostics(diagnostics) {
    _lodash2.default.forEach(diagnostics, function (d) {
        var message = _typescript2.default.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            var _d$file$getLineAndCha = d.file.getLineAndCharacterOfPosition(d.start);

            var line = _d$file$getLineAndCha.line;
            var character = _d$file$getLineAndCha.character;

            var lineText = d.file.fileName + ":" + (line + 1) + ":" + (character + 1);
            message = lineText + " " + message;
        }
        message = message.trim();
        if (d.category === 0 || d.category === 1) {
            _sighCore.log.warn(message.trim());
        } else {
            (0, _sighCore.log)(message);
        }
    });
}

function getCompilerOptions() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var tsconfigFile = _pkgDir2.default.sync() + "/tsconfig.json";
    if ((0, _fs.existsSync)(tsconfigFile)) {
        var tsconfig = require(tsconfigFile);
        _lodash2.default.assign(options, _lodash2.default.get(tsconfig, "compilerOptions", {}));
    }
    if (options.target) {
        options.target = getEnumOption(_typescript2.default.ScriptTarget, options.target);
    }
    if (options.module) {
        options.module = getEnumOption(_typescript2.default.ModuleKind, options.module);
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
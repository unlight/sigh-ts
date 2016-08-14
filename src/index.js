import {log, Event} from "sigh-core";
import {existsSync, readFileSync} from "fs";
import pkgDir from "pkg-dir";
import ts from "typescript";
import _ from "lodash";

export default function (op, compilerOptions = {}) {
    compilerOptions = getCompilerOptions(compilerOptions);
    var files = {};
    // Create the language service host to allow the LS to communicate with the host
    const servicesHost = {
        getScriptFileNames: () => _.keys(files),
        getScriptVersion: (filepath) => files[filepath] && files[filepath].version.toString(),
        getScriptSnapshot: (filepath) => {
            var data = "";
            if (files[filepath]) {
                data = files[filepath].data;
            } else {
                if (!existsSync(filepath)) return undefined;
                data = readFileSync(filepath).toString();
            }
            return ts.ScriptSnapshot.fromString(data);
        },
        getCurrentDirectory: _.constant(process.cwd()),
        getCompilationSettings: _.constant(compilerOptions),
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options)
    };
    // Create the language service files
    const service = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

    logDiagnostics(service.getCompilerOptionsDiagnostics());

    function eventCallback(event, index, events) {
        var eventPath = event.path;
        switch (event.type) {
            case "add":
            case "change":
                var info = files[eventPath]; 
                if (!info) {
                    info = { version: 0, data: "", dtsFile: null};
                    files[eventPath] = info;
                }
                info.version++;
                info.data = event.data;
                var {outputFiles, emitSkipped} = service.getEmitOutput(eventPath);
                var {jsFile, mapFile, dtsFile} = parseOutputFiles(outputFiles);
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
                logDiagnostics(diagnostics);
                // Log fatal error.
                if (emitSkipped) {
                    log.warn(`Emit of ${eventPath} failed (fatal errors).`);
                }
                break;
            case "remove":
                var dtsFile = _.get(info, "dtsFile");
                if (dtsFile) {
                    var dtsFileEvent = _.find(events, event => event.path === dtsFile);
                    if (dtsFileEvent) {
                        dtsFileEvent.type = "remove";
                    }
                }
                delete files[eventPath];
                break;
        }
        return event;
    }

    return op.stream.map(events => {
        _.each(events, eventCallback);
        return events;
    });
}

function parseOutputFiles(outputFiles) {
    var jsFile = _.find(outputFiles, f => _.endsWith(f.name, ".js"));
    var mapFile = _.find(outputFiles, f => _.endsWith(f.name, ".js.map"));
    var dtsFile = _.find(outputFiles, f => _.endsWith(f.name, ".d.ts"));
    return { jsFile, mapFile, dtsFile };
}

function logDiagnostics(diagnostics) {
    diagnostics.forEach(d => {
        var message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            var { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
            let lineText = `${d.file.fileName}:${line}:${character + 1}`;
            message = `${lineText} ${message}`;
        }
        message = message.trim();
        if (d.category === 0 || d.category === 1) {
            log.warn(message);
        } else {
            log(message);
        }
    });
}

function getCompilerOptions(options = {}) {
    var tsconfigFile = pkgDir.sync() + "/tsconfig.json";
    if (existsSync(tsconfigFile)) {
        var tsconfig = require(tsconfigFile);
        _.assign(options, _.get(tsconfig, "compilerOptions", {}));
    }
    if (options.target) {
        options.target = getEnumOption(ts.ScriptTarget, options.target);
    }
    if (options.module) {
        options.module = getEnumOption(ts.ModuleKind, options.module);
    }
    if (options.moduleResolution) {
        if (String(options.moduleResolution).toLocaleLowerCase() === "node") {
            options.moduleResolution = "NodeJs";
        }
        options.moduleResolution = getEnumOption(ts.ModuleResolutionKind, options.moduleResolution);
    }
    if (options.inlineSourceMap || options.sourceMap) {
        options.inlineSources = true;
    }
    return options;
}

function getEnumOption(collection, value) {
    var valueUpper = String(value).toLocaleUpperCase();
    var result = _.chain(collection)
        .findKey(value => String(value).toUpperCase() === valueUpper)
        .toNumber()
        .value();
    if (_.isNaN(result)) {
        result = value;
    }
    return result;
}

module.exports = exports["default"];
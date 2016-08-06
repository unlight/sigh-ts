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
    const services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

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
            var {outputFiles, emitSkipped} = services.getEmitOutput(event.path);
            for (var i = 0; i < outputFiles.length; i++) {
                var outfile = outputFiles[i];
                if (_.endsWith(outfile.name, ".js")) {
                    event.data = outfile.text;
                } else if (_.endsWith(outfile.name, ".js.map")) {
                    event.applySourceMap(JSON.parse(outfile.text));
                } else if (_.endsWith(outfile.name, ".d.ts")) {
                    var fields = _.pick(event, ["type", "basePath", "data", "path"]);
                    fields.data = outfile.text;
                    var newEvent = new Event(fields);
                    newEvent.changeFileSuffix("d.ts");
                    events.push(newEvent);
                }
            }
            // Log diagnostics.
            var diagnostics = []
                .concat(services.getSyntacticDiagnostics(event.path))
                .concat(services.getSemanticDiagnostics(event.path));

            logDiagnostics(diagnostics);

            if (emitSkipped) {
                log.warn(`Emit of ${event.path} failed (fatal errors).`);
            }
        }
        return event;
    }

    return op.stream.map(events => {
        _.each(events, eventCallback);
        return events;
    });
}

function logDiagnostics(diagnostics) {
    _.forEach(diagnostics, d => {
        var message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            var { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
            let lineText = `${d.file.fileName}:${line + 1}:${character + 1}`;
            message = `${lineText} ${message}`;
        }
        message = message.trim();
        if (d.category === 0 || d.category === 1) {
            log.warn(message.trim());
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
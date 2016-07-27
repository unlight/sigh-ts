import {mapEvents} from "sigh-core/lib/stream";
import {log} from "sigh-core";
import {existsSync, readFileSync} from "fs";

const pkgDir = require("pkg-dir");
const ts = require("typescript");
const _ = require("lodash");
var proc;

function task(options) {
    // This function is called once for each subprocess in order to cache state,
    // it is not a closure and does not have access to the surrounding state, use
    // `require` to include any modules you need, for further info see
    // https://github.com/ohjames/process-pool
    var typescript = require("typescript");
    var {reportDiagnostics = false} = options;
 
    // This task runs inside the subprocess to transform each event
    return event => typescript.transpileModule(event.data, {
        compilerOptions: options,
        fileName: event.path,
        reportDiagnostics
    });
}

export default function (op, options = {}) {
    if (!proc) {
        var compilerOptions = {};
        var tsconfigFile = pkgDir.sync() + "/tsconfig.json";
        if (existsSync(tsconfigFile)) {
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
        proc = op.procPool.prepare(task, options, { module });
    }

    return mapEvents(op.stream, event => {
        // Data sent to/received from the subprocess has to be serialised/deserialised
        if (!(event.type === "add" || event.type === "change")) return event;
        if (!(event.fileType === "ts" || event.fileType === "tsx")) return event;

        return proc(_.pick(event, "type", "data", "path", "projectPath")).then(result => {
            event.changeFileSuffix("js");
            event.data = result.outputText;
            if (result.diagnostics) {
                result.diagnostics.forEach(d => {
                    // Warning = 0, Error = 1, Message = 2.
                    if (d.category === 0 || d.category === 1) {
                        log.warn(`${d.messageText} ${d.file || ""} ${d.start || ""} ${d.length || ""}`.trim());
                    } else {
                        log(d.messageText);
                    } 
                });
            }
            if (result.sourceMapText) {
                event.sourceMap = JSON.parse(result.sourceMapText);
            }
            return event;
        });
    });
}

function getEnumOption(collection, value) {
    var valueUpper = String(value).toLocaleUpperCase();
    return _.chain(collection)
        .findKey(value => String(value).toUpperCase() === valueUpper)
        .toNumber()
        .value();
}

module.exports = exports["default"];
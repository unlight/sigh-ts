const { log, Event} = require("sigh-core");
import { existsSync, readFileSync } from "fs";
import * as Path from "path";
const pkgDir = require("pkg-dir");
import * as ts from "typescript";
import * as _ from "lodash";
import * as utils from "./utils";
import { SighEvent } from './event.interface';
import { FileInfo } from './file-info';

const npmPackage = pkgDir.sync();
const typingsIndex = Path.resolve(npmPackage, "typings/index.d.ts");

export default function(op, compilerOptions = {}) {
    const tsconfigFile = Path.join(npmPackage, "tsconfig.json");
    compilerOptions = utils.getCompilerOptions(tsconfigFile, compilerOptions);
    const logd = _.get(compilerOptions, "logd", utils.logDiagnostics);
    const files: {[path: string]: FileInfo} = {};
    const _existsSync = _.memoize(existsSync);
    const _readFileSync = _.memoize(readFileSync);
    // Create the language service host to allow the LS to communicate with the host
    const servicesHost = {
        getScriptFileNames: () => [typingsIndex, ...Object.keys(files)],
        getScriptVersion: (filepath) => files[filepath] && files[filepath].version.toString(),
        getScriptSnapshot: (filepath) => {
            var data;
            if (files[filepath]) {
                data = files[filepath].data;
                return ts.ScriptSnapshot.fromString(data);
            }
            if (!_existsSync(filepath) && filepath.indexOf('node_modules/typescript/lib') !== -1 && parseFloat(ts.version) >= 2) {
                var basename = Path.basename(filepath);
                filepath = `${Path.dirname(filepath)}/lib.${basename}`;
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
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    };
    // Create the language service files
    const service = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

    logd(service.getCompilerOptionsDiagnostics());

    function eventCallback(event: SighEvent, index, events: SighEvent[]) {
        const eventPath = event.path;
        let info = files[eventPath];
        switch (event.type) {
            case "add":
            case "change":
                if (!info) {
                    info = new FileInfo({ version: 0, data: "", dtsFile: null });
                    files[eventPath] = info;
                }
                info.version++;
                info.data = event.data;
                let {outputFiles, emitSkipped} = service.getEmitOutput(eventPath);
                let {jsFile, mapFile, dtsFile} = utils.parseOutputFiles(outputFiles);
                event.data = jsFile.text;
                event.changeFileSuffix("js");
                if (mapFile) {
                    event.applySourceMap(JSON.parse(mapFile.text));
                }
                if (dtsFile) {
                    let fields: any = _.pick(event, ["type", "basePath", "data", "path"]);
                    fields.data = dtsFile.text;
                    let newEvent = new Event(fields);
                    newEvent.changeFileSuffix("d.ts");
                    events.push(newEvent);
                    info.dtsFile = newEvent.path;
                }
                // Log diagnostics.
                let diagnostics = []
                    .concat(service.getSyntacticDiagnostics(eventPath))
                    .concat(service.getSemanticDiagnostics(eventPath));
                logd(diagnostics);
                // Log fatal error.
                if (emitSkipped) {
                    log.warn(`Emit of ${eventPath} failed (fatal errors).`);
                }
                break;
            case "remove":
                if (info && info.dtsFile) {
                    let dtsFileEvent = _.find(events, event => event.path === info.dtsFile);
                    if (dtsFileEvent) {
                        dtsFileEvent.type = "remove";
                    }
                }
                delete files[eventPath];
                break;
        }
        return event;
    }

    return op.stream.map((events: SighEvent[]) => {
        _.each(events, eventCallback);
        return events;
    });
}

module.exports = exports["default"];
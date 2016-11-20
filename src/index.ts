const { log, Event} = require("sigh-core");
import { existsSync, readFileSync } from "fs";
import * as Path from "path";
const pkgDir = require("pkg-dir");
import * as ts from "typescript";
import * as _ from "lodash";
import * as utils from "./utils";
import { SighEvent } from './event.interface';
import { FileInfo, FileInfoDictionary } from './file-info';

const npmPackage = pkgDir.sync();
const typingsIndex = Path.resolve(npmPackage, "typings/index.d.ts");

export default function(op, compilerOptions: ts.CompilerOptions = {}) {
    const tsconfigFile = Path.join(npmPackage, "tsconfig.json");
    compilerOptions = utils.getCompilerOptions(tsconfigFile, compilerOptions);
    const files: FileInfoDictionary = {};
    const service = utils.createLanguageService({ files, tsconfigFile, compilerOptions, typingsIndex })

    const logd = _.get(compilerOptions, "logd", utils.logDiagnostics);
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
                    let {type, basePath, path} = event;
                    let newEvent = new Event({ type, basePath, path, data: dtsFile.text });
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
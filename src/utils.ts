import * as ts from "typescript";
import { existsSync, readFileSync } from "fs";
import * as _ from "lodash";
const { log } = require("sigh-core");

export function logDiagnostics(diagnostics) {
    diagnostics.forEach(d => {
        let message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            let { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
            let lineText = `${d.file.fileName}:${line + 1}:${character + 1}`;
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

export function getCompilerOptions(tsconfigFile, options: ts.CompilerOptions = {}) {
    if (existsSync(tsconfigFile)) {
        const tsconfig = require(tsconfigFile);
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

export function getEnumOption(collection, value) {
    let valueUpper = String(value).toLocaleUpperCase();
    let result = _.chain(collection)
        .findKey(value => String(value).toUpperCase() === valueUpper)
        .toNumber()
        .value();
    if (_.isNaN(result)) {
        result = value;
    }
    return result;
}

export function parseOutputFiles(outputFiles: ts.OutputFile[]) {
    let jsFile = _.find(outputFiles, f => _.endsWith(f.name, ".js"));
    let mapFile = _.find(outputFiles, f => _.endsWith(f.name, ".js.map"));
    let dtsFile = _.find(outputFiles, f => _.endsWith(f.name, ".d.ts"));
    return { jsFile, mapFile, dtsFile };
}

import * as ts from "typescript";
import { existsSync, readFileSync } from "fs";
import * as _ from "lodash";
import * as Path from "path";
import { SighEvent } from './event.interface';
import { FileInfo, FileInfoDictionary } from './file-info';
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

const tsVersion = parseFloat(ts.version);

export function createLanguageService({files, tsconfigFile, compilerOptions, typingsIndex}) {
    compilerOptions = getCompilerOptions(tsconfigFile, compilerOptions);
    const logd = _.get(compilerOptions, "logd", logDiagnostics);
    const _existsSync = _.memoize(existsSync);
    const _readFileSync = _.memoize(readFileSync);
    // Create the language service host to allow the LS to communicate with the host.
    const servicesHost = {
        getScriptFileNames: () => [typingsIndex, ...Object.keys(files)],
        getScriptVersion: (filepath: string) => files[filepath] && files[filepath].version.toString(),
        getScriptSnapshot: (filepath: string) => {
            let data;
            if (files[filepath]) {
                data = files[filepath].data;
                return ts.ScriptSnapshot.fromString(data);
            }
            if (!_existsSync(filepath) && filepath.indexOf('node_modules/typescript/lib') !== -1 && tsVersion >= 2) {
                let basename = Path.basename(filepath);
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
    // Create the language service files.
    return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}
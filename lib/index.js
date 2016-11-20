"use strict";
var _a = require("sigh-core"), log = _a.log, Event = _a.Event;
var Path = require("path");
var pkgDir = require("pkg-dir");
var _ = require("lodash");
var npmPackage = pkgDir.sync();
var typingsIndex = Path.resolve(npmPackage, "typings/index.d.ts");
var pooledProc;
function tsCompilerTask(compilerOptions) {
    var writeFileSync = require('fs').writeFileSync;
    // writeFileSync("debug.log", JSON.stringify(compilerOptions));
    // this function is called once for each subprocess in order to cache state,
    // it is not a closure and does not have access to the surrounding state, use
    // `require` to include any modules you need, for further info see
    // https://github.com/ohjames/process-pool
    var log = require('sigh-core').log;
    // writeFileSync("debug.log", JSON.stringify(compilerOptions));
    // this task runs inside the subprocess to transform each event
    return function (event) {
        require('fs').writeFileSync("d:/My/Dev/sigh-ts/debug.log", JSON.stringify(1));
        console.log('event ts', event);
        var data, sourceMap;
        data = 'dummy';
        // TODO: data = compile(event.data) etc.
        return { data: data, sourceMap: sourceMap };
    };
}
function adaptEvent(compiler) {
    console.log('compiler', compiler);
    // data sent to/received from the subprocess has to be serialised/deserialised
    return function (event) {
        // console.log('event', event);
        // if (event.type !== 'add' && event.type !== 'change') return event
        // if (event.fileType !== 'relevantType') return event
        var cres = compiler(_.pick(event, 'type', 'data', 'path', 'projectPath'));
        return cres.then(function (result) {
            //     console.log('result', result);
            //     event.data = result.data;
            //     if (result.sourceMap)
            //         event.applySourceMap(JSON.parse(result.sourceMap))
            //     // event.changeFileSuffix('newSuffix')
            //     return event
        });
    };
}
function default_1(op, compilerOptions) {
    if (compilerOptions === void 0) { compilerOptions = {}; }
    if (!pooledProc) {
        pooledProc = op.procPool.prepare(tsCompilerTask, compilerOptions, { module: module });
    }
    var eventCallback = adaptEvent(pooledProc);
    return op.stream.map(function (events) {
        _.each(events, eventCallback);
        return events;
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
// export default function(op, compilerOptions = {}) {
//     const tsconfigFile = Path.join(npmPackage, "tsconfig.json");
//     compilerOptions = utils.getCompilerOptions(tsconfigFile, compilerOptions);
//     const logd = _.get(compilerOptions, "logd", utils.logDiagnostics);
//     const files: {[path: string]: FileInfo} = {};
//     const _existsSync = _.memoize(existsSync);
//     const _readFileSync = _.memoize(readFileSync);
//     // Create the language service host to allow the LS to communicate with the host
//     const servicesHost = {
//         getScriptFileNames: () => [typingsIndex, ...Object.keys(files)],
//         getScriptVersion: (filepath) => files[filepath] && files[filepath].version.toString(),
//         getScriptSnapshot: (filepath) => {
//             var data;
//             if (files[filepath]) {
//                 data = files[filepath].data;
//                 return ts.ScriptSnapshot.fromString(data);
//             }
//             if (!_existsSync(filepath) && filepath.indexOf('node_modules/typescript/lib') !== -1 && parseFloat(ts.version) >= 2) {
//                 var basename = Path.basename(filepath);
//                 filepath = `${Path.dirname(filepath)}/lib.${basename}`;
//             }
//             // TODO: Too slow. Read package.json and restrict finding.
//             if (!_existsSync(filepath)) {
//                 return undefined;
//             }
//             data = _readFileSync(filepath).toString();
//             return ts.ScriptSnapshot.fromString(data);
//         },
//         getCurrentDirectory: _.constant(process.cwd()),
//         getCompilationSettings: _.constant(compilerOptions),
//         getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
//     };
//     // Create the language service files
//     const service = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
//     logd(service.getCompilerOptionsDiagnostics());
//     function eventCallback(event: SighEvent, index, events: SighEvent[]) {
//         const eventPath = event.path;
//         let info = files[eventPath];
//         switch (event.type) {
//             case "add":
//             case "change":
//                 if (!info) {
//                     info = new FileInfo({ version: 0, data: "", dtsFile: null });
//                     files[eventPath] = info;
//                 }
//                 info.version++;
//                 info.data = event.data;
//                 let {outputFiles, emitSkipped} = service.getEmitOutput(eventPath);
//                 let {jsFile, mapFile, dtsFile} = utils.parseOutputFiles(outputFiles);
//                 event.data = jsFile.text;
//                 event.changeFileSuffix("js");
//                 if (mapFile) {
//                     event.applySourceMap(JSON.parse(mapFile.text));
//                 }
//                 if (dtsFile) {
//                     let fields: any = _.pick(event, ["type", "basePath", "data", "path"]);
//                     fields.data = dtsFile.text;
//                     let newEvent = new Event(fields);
//                     newEvent.changeFileSuffix("d.ts");
//                     events.push(newEvent);
//                     info.dtsFile = newEvent.path;
//                 }
//                 // Log diagnostics.
//                 let diagnostics = []
//                     .concat(service.getSyntacticDiagnostics(eventPath))
//                     .concat(service.getSemanticDiagnostics(eventPath));
//                 logd(diagnostics);
//                 // Log fatal error.
//                 if (emitSkipped) {
//                     log.warn(`Emit of ${eventPath} failed (fatal errors).`);
//                 }
//                 break;
//             case "remove":
//                 if (info && info.dtsFile) {
//                     let dtsFileEvent = _.find(events, event => event.path === info.dtsFile);
//                     if (dtsFileEvent) {
//                         dtsFileEvent.type = "remove";
//                     }
//                 }
//                 delete files[eventPath];
//                 break;
//         }
//         return event;
//     }
//     return op.stream.map((events: SighEvent[]) => {
//         _.each(events, eventCallback);
//         return events;
//     });
// }
module.exports = exports["default"];
//# sourceMappingURL=index.js.map
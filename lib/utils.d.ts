import * as ts from "typescript";
export declare function logDiagnostics(diagnostics: any): void;
export declare function getCompilerOptions(tsconfigFile: any, options?: ts.CompilerOptions): ts.CompilerOptions;
export declare function getEnumOption(collection: any, value: any): number;
export declare function parseOutputFiles(outputFiles: ts.OutputFile[]): {
    jsFile: ts.OutputFile;
    mapFile: ts.OutputFile;
    dtsFile: ts.OutputFile;
};
export declare function createLanguageService({files, tsconfigFile, compilerOptions, typingsIndex}: {
    files: any;
    tsconfigFile: any;
    compilerOptions: any;
    typingsIndex: any;
}): ts.LanguageService;

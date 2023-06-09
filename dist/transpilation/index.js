"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpileString = exports.transpileVirtualProject = exports.createVirtualProgram = exports.transpileProject = exports.transpileFiles = void 0;
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const tsconfig_1 = require("../cli/tsconfig");
const utils_1 = require("../utils");
const output_collector_1 = require("./output-collector");
const transpiler_1 = require("./transpiler");
__exportStar(require("./transpile"), exports);
__exportStar(require("./transpiler"), exports);
function transpileFiles(rootNames, options = {}, writeFile) {
    const program = ts.createProgram(rootNames, options);
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);
    const { diagnostics: transpileDiagnostics, emitSkipped } = new transpiler_1.Transpiler().emit({ program, writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([...preEmitDiagnostics, ...transpileDiagnostics]);
    return { diagnostics: [...diagnostics], emitSkipped };
}
exports.transpileFiles = transpileFiles;
function transpileProject(configFileName, optionsToExtend, writeFile) {
    const parseResult = (0, tsconfig_1.parseConfigFileWithSystem)(configFileName, optionsToExtend);
    if (parseResult.errors.length > 0) {
        return { diagnostics: parseResult.errors, emitSkipped: true };
    }
    return transpileFiles(parseResult.fileNames, parseResult.options, writeFile);
}
exports.transpileProject = transpileProject;
const libCache = {};
/** @internal */
function createVirtualProgram(input, options = {}) {
    const normalizedFiles = {};
    for (const [path, file] of Object.entries(input)) {
        normalizedFiles[(0, utils_1.normalizeSlashes)(path)] = file;
    }
    const compilerHost = {
        fileExists: fileName => fileName in normalizedFiles || ts.sys.fileExists(fileName),
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getDefaultLibFileName: ts.getDefaultLibFileName,
        readFile: () => "",
        getNewLine: () => "\n",
        useCaseSensitiveFileNames: () => false,
        writeFile() { },
        getSourceFile(fileName) {
            if (fileName in normalizedFiles) {
                return ts.createSourceFile(fileName, normalizedFiles[fileName], ts.ScriptTarget.Latest, false);
            }
            let filePath;
            if (fileName.startsWith("lib.")) {
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                filePath = path.join(typeScriptDir, fileName);
            }
            if (fileName.includes("language-extensions")) {
                const dtsName = fileName.replace(/(\.d)?(\.ts)$/, ".d.ts");
                filePath = path.resolve(dtsName);
            }
            if (filePath !== undefined) {
                if (libCache[fileName])
                    return libCache[fileName];
                const content = fs.readFileSync(filePath, "utf8");
                libCache[fileName] = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false);
                return libCache[fileName];
            }
        },
    };
    return ts.createProgram(Object.keys(normalizedFiles), options, compilerHost);
}
exports.createVirtualProgram = createVirtualProgram;
function transpileVirtualProject(files, options = {}) {
    const program = createVirtualProgram(files, options);
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);
    const collector = (0, output_collector_1.createEmitOutputCollector)();
    const { diagnostics: transpileDiagnostics } = new transpiler_1.Transpiler().emit({ program, writeFile: collector.writeFile });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([...preEmitDiagnostics, ...transpileDiagnostics]);
    return { diagnostics: [...diagnostics], transpiledFiles: collector.files };
}
exports.transpileVirtualProject = transpileVirtualProject;
function transpileString(main, options = {}) {
    const { diagnostics, transpiledFiles } = transpileVirtualProject({ "main.ts": main }, options);
    return {
        diagnostics,
        file: transpiledFiles.find(({ sourceFiles }) => sourceFiles.some(f => f.fileName === "main.ts")),
    };
}
exports.transpileString = transpileString;
//# sourceMappingURL=index.js.map
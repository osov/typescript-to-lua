"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectRoot = exports.getEmitOutDir = exports.getSourceDir = exports.getEmitPathRelativeToOutDir = exports.getEmitPath = exports.Transpiler = void 0;
const path = require("path");
const ts = require("typescript");
const CompilerOptions_1 = require("../CompilerOptions");
const LuaLib_1 = require("../LuaLib");
const utils_1 = require("../utils");
const bundle_1 = require("./bundle");
const plugins_1 = require("./plugins");
const resolve_1 = require("./resolve");
const transpile_1 = require("./transpile");
const performance = require("../measure-performance");
class Transpiler {
    constructor({ emitHost = ts.sys } = {}) {
        this.emitHost = emitHost;
    }
    emit(emitOptions) {
        const { program, writeFile = this.emitHost.writeFile, plugins: optionsPlugins = [] } = emitOptions;
        const { diagnostics: getPluginsDiagnostics, plugins: configPlugins } = (0, plugins_1.getPlugins)(program);
        const plugins = [...optionsPlugins, ...configPlugins];
        const { diagnostics: transpileDiagnostics, transpiledFiles: freshFiles } = (0, transpile_1.getProgramTranspileResult)(this.emitHost, writeFile, {
            ...emitOptions,
            plugins,
        });
        const { emitPlan } = this.getEmitPlan(program, transpileDiagnostics, freshFiles);
        const emitDiagnostics = this.emitFiles(program, plugins, emitPlan, writeFile);
        return {
            diagnostics: getPluginsDiagnostics.concat(transpileDiagnostics, emitDiagnostics),
            emitSkipped: emitPlan.length === 0,
        };
    }
    emitFiles(program, plugins, emitPlan, writeFile) {
        var _a, _b;
        performance.startSection("emit");
        const options = program.getCompilerOptions();
        if (options.tstlVerbose) {
            console.log("Emitting output");
        }
        const diagnostics = [];
        for (const plugin of plugins) {
            if (plugin.beforeEmit) {
                const beforeEmitPluginDiagnostics = (_a = plugin.beforeEmit(program, options, this.emitHost, emitPlan)) !== null && _a !== void 0 ? _a : [];
                diagnostics.push(...beforeEmitPluginDiagnostics);
            }
        }
        const emitBOM = (_b = options.emitBOM) !== null && _b !== void 0 ? _b : false;
        for (const { outputPath, code, sourceMap, sourceFiles } of emitPlan) {
            if (options.tstlVerbose) {
                console.log(`Emitting ${(0, utils_1.normalizeSlashes)(outputPath)}`);
            }
            writeFile(outputPath, code, emitBOM, undefined, sourceFiles);
            if (options.sourceMap && sourceMap !== undefined) {
                writeFile(outputPath + ".map", sourceMap, emitBOM, undefined, sourceFiles);
            }
        }
        if (options.tstlVerbose) {
            console.log("Emit finished!");
        }
        performance.endSection("emit");
        return diagnostics;
    }
    getEmitPlan(program, diagnostics, files) {
    	var _a;
        performance.startSection("getEmitPlan");
        const options = program.getCompilerOptions();
        if (options.tstlVerbose) {
            console.log("Constructing emit plan");
        }
        // Resolve imported modules and modify output Lua requires
        const resolutionResult = (0, resolve_1.resolveDependencies)(program, files, this.emitHost);
        diagnostics.push(...resolutionResult.diagnostics);
        const lualibRequired = resolutionResult.resolvedFiles.some(f => f.fileName === "lualib_bundle");
        if (lualibRequired) {
            // Remove lualib placeholders from resolution result
            resolutionResult.resolvedFiles = resolutionResult.resolvedFiles.filter(f => f.fileName !== "lualib_bundle");
            if (options.tstlVerbose) {
                console.log("Including lualib bundle");
            }
            // Add lualib bundle to source dir 'virtually', will be moved to correct output dir in emitPlan
            const fileName = (0, utils_1.normalizeSlashes)(path.resolve(getSourceDir(program), "lualib_bundle.lua"));
            const code = this.getLuaLibBundleContent(options, resolutionResult.resolvedFiles);
            resolutionResult.resolvedFiles.unshift({ fileName, code });
        }
        let emitPlan;
        if ((0, CompilerOptions_1.isBundleEnabled)(options)) {
            const [bundleDiagnostics, bundleFile] = (0, bundle_1.getBundleResult)(program, resolutionResult.resolvedFiles);
            diagnostics.push(...bundleDiagnostics);
            emitPlan = [bundleFile];
        }
        else {
            emitPlan = resolutionResult.resolvedFiles.map(file => ({
                ...file,
                outputPath: getEmitPath(file.fileName, program),
            }));
        }
        performance.endSection("getEmitPlan");
        return { emitPlan };
    }
    getLuaLibBundleContent(options, resolvedFiles) {
        var _a;
        const luaTarget = (_a = options.luaTarget) !== null && _a !== void 0 ? _a : CompilerOptions_1.LuaTarget.Universal;
        if (options.luaLibImport === CompilerOptions_1.LuaLibImportKind.RequireMinimal) {
            const usedFeatures = (0, LuaLib_1.findUsedLualibFeatures)(luaTarget, this.emitHost, resolvedFiles.map(f => f.code));
            return (0, LuaLib_1.buildMinimalLualibBundle)(usedFeatures, luaTarget, this.emitHost);
        }
        else {
            return (0, LuaLib_1.getLuaLibBundle)(luaTarget, this.emitHost);
        }
    }
}
exports.Transpiler = Transpiler;
function getEmitPath(file, program) {
    const relativeOutputPath = getEmitPathRelativeToOutDir(file, program);
    const outDir = getEmitOutDir(program);
    return path.join(outDir, relativeOutputPath);
}
exports.getEmitPath = getEmitPath;
function getEmitPathRelativeToOutDir(fileName, program) {
    var _a;
    const sourceDir = getSourceDir(program);
    // Default output path is relative path in source dir
    let emitPathSplits = path.relative(sourceDir, fileName).split(path.sep);
    // If source is in a parent directory of source dir, move it into the source dir
    emitPathSplits = emitPathSplits.filter(s => s !== "..");
    // To avoid overwriting lua sources in node_modules, emit into lua_modules
    if (emitPathSplits[0] === "node_modules") {
        emitPathSplits[0] = "lua_modules";
    }
    // Set extension
    const extension = ((_a = program.getCompilerOptions().extension) !== null && _a !== void 0 ? _a : "lua").trim();
    const trimmedExtension = extension.startsWith(".") ? extension.substring(1) : extension;
    const trimExtensions = program.getCompilerOptions().trimExtensions;
    emitPathSplits[emitPathSplits.length - 1] =
        //(0, utils_1.trimExtension)(emitPathSplits[emitPathSplits.length - 1]) + "." + trimmedExtension;
          (0, utils_1.trimExtension)(emitPathSplits[emitPathSplits.length - 1]) + (trimExtensions === true && /.*\..*\.ts$/.test(emitPathSplits[emitPathSplits.length - 1]) ?  "" : ".lua");
    return path.join(...emitPathSplits);
}
exports.getEmitPathRelativeToOutDir = getEmitPathRelativeToOutDir;
function getSourceDir(program) {
    const rootDir = program.getCompilerOptions().rootDir;
    if (rootDir && rootDir.length > 0) {
        return path.isAbsolute(rootDir) ? rootDir : path.resolve(getProjectRoot(program), rootDir);
    }
    return program.getCommonSourceDirectory();
}
exports.getSourceDir = getSourceDir;
function getEmitOutDir(program) {
    const outDir = program.getCompilerOptions().outDir;
    if (outDir && outDir.length > 0) {
        return path.isAbsolute(outDir) ? outDir : path.resolve(getProjectRoot(program), outDir);
    }
    // If no outDir is provided, emit in project root
    return getProjectRoot(program);
}
exports.getEmitOutDir = getEmitOutDir;
function getProjectRoot(program) {
    // Try to get the directory the tsconfig is in
    const tsConfigPath = program.getCompilerOptions().configFilePath;
    // If no tsconfig is known, use common source directory
    return tsConfigPath ? path.dirname(tsConfigPath) : program.getCommonSourceDirectory();
}
exports.getProjectRoot = getProjectRoot;
//# sourceMappingURL=transpiler.js.map
#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const tstl = require(".");
const cliDiagnostics = require("./cli/diagnostics");
const information_1 = require("./cli/information");
const parse_1 = require("./cli/parse");
const report_1 = require("./cli/report");
const tsconfig_1 = require("./cli/tsconfig");
const CompilerOptions_1 = require("./CompilerOptions");
const performance = require("./measure-performance");
const shouldBePretty = ({ pretty } = {}) => { var _a, _b, _c; return pretty !== undefined ? pretty : (_c = (_b = (_a = ts.sys).writeOutputIsTTY) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : false; };
let reportDiagnostic = (0, report_1.createDiagnosticReporter)(false);
function updateReportDiagnostic(options) {
    reportDiagnostic = (0, report_1.createDiagnosticReporter)(shouldBePretty(options));
}
function createWatchStatusReporter(options) {
    return ts.createWatchStatusReporter(ts.sys, shouldBePretty(options));
}
function executeCommandLine(args) {
    if (args.length > 0 && args[0].startsWith("-")) {
        const firstOption = args[0].slice(args[0].startsWith("--") ? 2 : 1).toLowerCase();
        if (firstOption === "build" || firstOption === "b") {
            return performBuild(args.slice(1));
        }
    }
    const commandLine = (0, parse_1.parseCommandLine)(args);
    if (commandLine.options.build) {
        reportDiagnostic(cliDiagnostics.optionBuildMustBeFirstCommandLineArgument());
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }
    // TODO: ParsedCommandLine.errors isn't meant to contain warnings. Once root-level options
    // support would be dropped it should be changed to `commandLine.errors.length > 0`.
    if (commandLine.errors.some(e => e.category === ts.DiagnosticCategory.Error)) {
        commandLine.errors.forEach(reportDiagnostic);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }
    if (commandLine.options.version) {
        console.log(information_1.versionString);
        return ts.sys.exit(ts.ExitStatus.Success);
    }
    if (commandLine.options.help) {
        console.log(information_1.versionString);
        console.log((0, information_1.getHelpString)());
        return ts.sys.exit(ts.ExitStatus.Success);
    }
    const configFileName = (0, tsconfig_1.locateConfigFile)(commandLine);
    if (typeof configFileName === "object") {
        reportDiagnostic(configFileName);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }
    const commandLineOptions = commandLine.options;
    if (configFileName) {
        const configParseResult = (0, tsconfig_1.parseConfigFileWithSystem)(configFileName, commandLineOptions);
        updateReportDiagnostic(configParseResult.options);
        if (configParseResult.options.watch) {
            createWatchOfConfigFile(configFileName, commandLineOptions);
        }
        else {
            performCompilation(configParseResult.fileNames, configParseResult.projectReferences, configParseResult.options, ts.getConfigFileParsingDiagnostics(configParseResult));
        }
    }
    else {
        updateReportDiagnostic(commandLineOptions);
        if (commandLineOptions.watch) {
            createWatchOfFilesAndCompilerOptions(commandLine.fileNames, commandLineOptions);
        }
        else {
            performCompilation(commandLine.fileNames, commandLine.projectReferences, commandLineOptions);
        }
    }
}
function performBuild(_args) {
    console.log("Option '--build' is not supported.");
    return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
}
function performCompilation(rootNames, projectReferences, options, configFileParsingDiagnostics) {
    if (options.measurePerformance)
        performance.enableMeasurement();
    performance.startSection("createProgram");
    const program = ts.createProgram({
        rootNames,
        options,
        projectReferences,
        configFileParsingDiagnostics,
    });
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);
    performance.endSection("createProgram");
    const { diagnostics: transpileDiagnostics, emitSkipped } = new tstl.Transpiler().emit({ program });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([...preEmitDiagnostics, ...transpileDiagnostics]);
    diagnostics.forEach(reportDiagnostic);
    if (options.measurePerformance)
        reportPerformance();
    const exitCode = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length === 0
        ? ts.ExitStatus.Success
        : emitSkipped
            ? ts.ExitStatus.DiagnosticsPresent_OutputsSkipped
            : ts.ExitStatus.DiagnosticsPresent_OutputsGenerated;
    return ts.sys.exit(exitCode);
}
function createWatchOfConfigFile(configFileName, optionsToExtend) {
    const watchCompilerHost = ts.createWatchCompilerHost(configFileName, optionsToExtend, ts.sys, ts.createSemanticDiagnosticsBuilderProgram, undefined, createWatchStatusReporter(optionsToExtend));
    updateWatchCompilationHost(watchCompilerHost, optionsToExtend);
    ts.createWatchProgram(watchCompilerHost);
}
function createWatchOfFilesAndCompilerOptions(rootFiles, options) {
    const watchCompilerHost = ts.createWatchCompilerHost(rootFiles, options, ts.sys, ts.createSemanticDiagnosticsBuilderProgram, undefined, createWatchStatusReporter(options));
    updateWatchCompilationHost(watchCompilerHost, options);
    ts.createWatchProgram(watchCompilerHost);
}
function updateWatchCompilationHost(host, optionsToExtend) {
    let hadErrorLastTime = true;
    const updateConfigFile = (0, tsconfig_1.createConfigFileUpdater)(optionsToExtend);
    const transpiler = new tstl.Transpiler();
    host.afterProgramCreate = builderProgram => {
        const program = builderProgram.getProgram();
        const options = builderProgram.getCompilerOptions();
        if (options.measurePerformance)
            performance.enableMeasurement();
        const configFileParsingDiagnostics = updateConfigFile(options);
        let sourceFiles;
        if (!(0, CompilerOptions_1.isBundleEnabled)(options) && !hadErrorLastTime) {
            sourceFiles = [];
            while (true) {
                const currentFile = builderProgram.getSemanticDiagnosticsOfNextAffectedFile();
                if (!currentFile)
                    break;
                if ("fileName" in currentFile.affected) {
                    sourceFiles.push(currentFile.affected);
                }
                else {
                    sourceFiles.push(...currentFile.affected.getSourceFiles());
                }
            }
        }
        const { diagnostics: emitDiagnostics } = transpiler.emit({ program, sourceFiles });
        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...configFileParsingDiagnostics,
            ...program.getOptionsDiagnostics(),
            ...program.getSyntacticDiagnostics(),
            ...program.getGlobalDiagnostics(),
            ...program.getSemanticDiagnostics(),
            ...emitDiagnostics,
        ]);
        diagnostics.forEach(reportDiagnostic);
        if (options.measurePerformance)
            reportPerformance();
        const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
        hadErrorLastTime = errors.length > 0;
        host.onWatchStatusChange(cliDiagnostics.watchErrorSummary(errors.length), host.getNewLine(), options);
    };
}
function reportPerformance() {
    if (performance.isMeasurementEnabled()) {
        console.log("Performance measurements: ");
        performance.forEachMeasure((name, duration) => {
            console.log(`  ${name}: ${duration.toFixed(2)}ms`);
        });
        console.log(`Total: ${performance.getTotalDuration().toFixed(2)}ms`);
        performance.disableMeasurement();
    }
}
function checkNodeVersion() {
    const [major, minor] = process.version.slice(1).split(".").map(Number);
    const isValid = major > 12 || (major === 12 && minor >= 13);
    if (!isValid) {
        console.error(`TypeScriptToLua requires Node.js >=12.13.0, the current version is ${process.version}`);
        process.exit(1);
    }
}
checkNodeVersion();
if (ts.sys.setBlocking) {
    ts.sys.setBlocking();
}
executeCommandLine(ts.sys.args);
//# sourceMappingURL=tstl.js.map
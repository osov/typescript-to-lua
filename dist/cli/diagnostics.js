"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionBuildMustBeFirstCommandLineArgument = exports.optionCanOnlyBeSpecifiedInTsconfigJsonFile = exports.argumentForOptionMustBe = exports.compilerOptionExpectsAnArgument = exports.theSpecifiedPathDoesNotExist = exports.cannotFindATsconfigJsonAtTheSpecifiedDirectory = exports.optionProjectCannotBeMixedWithSourceFilesOnACommandLine = exports.compilerOptionCouldNotParseJson = exports.compilerOptionRequiresAValueOfType = exports.unknownCompilerOption = exports.watchErrorSummary = exports.tstlOptionsAreMovingToTheTstlObject = void 0;
const ts = require("typescript");
const utils_1 = require("../utils");
exports.tstlOptionsAreMovingToTheTstlObject = (0, utils_1.createSerialDiagnosticFactory)((tstl) => ({
    category: ts.DiagnosticCategory.Warning,
    messageText: 'TSTL options are moving to the "tstl" object. Adjust your tsconfig to look like\n' +
        `"tstl": ${JSON.stringify(tstl, undefined, 4)}`,
}));
const watchErrorSummary = (errorCount) => ({
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Message,
    code: errorCount === 1 ? 6193 : 6194,
    messageText: errorCount === 1
        ? "Found 1 error. Watching for file changes."
        : `Found ${errorCount} errors. Watching for file changes.`,
});
exports.watchErrorSummary = watchErrorSummary;
const createCommandLineError = (code, getMessage) => (0, utils_1.createDiagnosticFactoryWithCode)(code, (...args) => ({ messageText: getMessage(...args) }));
exports.unknownCompilerOption = createCommandLineError(5023, (name) => `Unknown compiler option '${name}'.`);
exports.compilerOptionRequiresAValueOfType = createCommandLineError(5024, (name, type) => `Compiler option '${name}' requires a value of type ${type}.`);
exports.compilerOptionCouldNotParseJson = createCommandLineError(5025, (name, error) => `Compiler option '${name}' failed to parse the given JSON value: '${error}'.`);
exports.optionProjectCannotBeMixedWithSourceFilesOnACommandLine = createCommandLineError(5042, () => "Option 'project' cannot be mixed with source files on a command line.");
exports.cannotFindATsconfigJsonAtTheSpecifiedDirectory = createCommandLineError(5057, (dir) => `Cannot find a tsconfig.json file at the specified directory: '${dir}'.`);
exports.theSpecifiedPathDoesNotExist = createCommandLineError(5058, (dir) => `The specified path does not exist: '${dir}'.`);
exports.compilerOptionExpectsAnArgument = createCommandLineError(6044, (name) => `Compiler option '${name}' expects an argument.`);
exports.argumentForOptionMustBe = createCommandLineError(6046, (name, values) => `Argument for '${name}' option must be: ${values}.`);
exports.optionCanOnlyBeSpecifiedInTsconfigJsonFile = createCommandLineError(6064, (name) => `Option '${name}' can only be specified in 'tsconfig.json' file.`);
exports.optionBuildMustBeFirstCommandLineArgument = createCommandLineError(6369, () => "Option '--build' must be the first command line argument.");
//# sourceMappingURL=diagnostics.js.map
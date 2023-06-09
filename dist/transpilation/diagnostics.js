"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathsWithoutBaseUrl = exports.unsupportedJsxEmit = exports.cannotBundleLibrary = exports.usingLuaBundleWithInlineMightGenerateDuplicateCode = exports.luaBundleEntryIsRequired = exports.couldNotFindBundleEntryPoint = exports.transformerShouldBeATsTransformerFactory = exports.shouldHaveAExport = exports.couldNotResolveFrom = exports.toLoadItShouldBeTranspiled = exports.couldNotReadDependency = exports.couldNotResolveRequire = void 0;
const ts = require("typescript");
const utils_1 = require("../utils");
const createDiagnosticFactory = (getMessage, category = ts.DiagnosticCategory.Error) => (0, utils_1.createSerialDiagnosticFactory)((...args) => ({ messageText: getMessage(...args), category }));
exports.couldNotResolveRequire = createDiagnosticFactory((requirePath, containingFile) => `Could not resolve lua source files for require path '${requirePath}' in file ${containingFile}.`);
exports.couldNotReadDependency = createDiagnosticFactory((dependency) => `Could not read content of resolved dependency ${dependency}.`);
exports.toLoadItShouldBeTranspiled = createDiagnosticFactory((kind, transform) => `To load "${transform}" ${kind} it should be transpiled or "ts-node" should be installed.`);
exports.couldNotResolveFrom = createDiagnosticFactory((kind, transform, base) => `Could not resolve "${transform}" ${kind} from "${base}".`);
exports.shouldHaveAExport = createDiagnosticFactory((kind, transform, importName) => `"${transform}" ${kind} should have a "${importName}" export.`);
exports.transformerShouldBeATsTransformerFactory = createDiagnosticFactory((transform) => `"${transform}" transformer should be a ts.TransformerFactory or an object with ts.TransformerFactory values.`);
exports.couldNotFindBundleEntryPoint = createDiagnosticFactory((entryPoint) => `Could not find bundle entry point '${entryPoint}'. It should be a file in the project.`);
exports.luaBundleEntryIsRequired = createDiagnosticFactory(() => "'luaBundleEntry' is required when 'luaBundle' is enabled.");
exports.usingLuaBundleWithInlineMightGenerateDuplicateCode = (0, utils_1.createSerialDiagnosticFactory)(() => ({
    category: ts.DiagnosticCategory.Warning,
    messageText: "Using 'luaBundle' with 'luaLibImport: \"inline\"' might generate duplicate code. " +
        "It is recommended to use 'luaLibImport: \"require\"'.",
}));
exports.cannotBundleLibrary = createDiagnosticFactory(() => 'Cannot bundle projects with "buildmode": "library". Projects including the library can still bundle (which will include external library files).');
exports.unsupportedJsxEmit = createDiagnosticFactory(() => 'JSX is only supported with "react" jsx option.');
exports.pathsWithoutBaseUrl = createDiagnosticFactory(() => "When configuring 'paths' in tsconfig.json, the option 'baseUrl' must also be provided.");
//# sourceMappingURL=diagnostics.js.map
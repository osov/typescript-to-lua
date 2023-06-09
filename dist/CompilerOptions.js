"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptions = exports.isBundleEnabled = exports.BuildMode = exports.LuaTarget = exports.LuaLibImportKind = void 0;
const typescript_1 = require("typescript");
const diagnosticFactories = require("./transpilation/diagnostics");
var LuaLibImportKind;
(function (LuaLibImportKind) {
    LuaLibImportKind["None"] = "none";
    LuaLibImportKind["Inline"] = "inline";
    LuaLibImportKind["Require"] = "require";
    LuaLibImportKind["RequireMinimal"] = "require-minimal";
})(LuaLibImportKind = exports.LuaLibImportKind || (exports.LuaLibImportKind = {}));
var LuaTarget;
(function (LuaTarget) {
    LuaTarget["Universal"] = "universal";
    LuaTarget["Lua50"] = "5.0";
    LuaTarget["Lua51"] = "5.1";
    LuaTarget["Lua52"] = "5.2";
    LuaTarget["Lua53"] = "5.3";
    LuaTarget["Lua54"] = "5.4";
    LuaTarget["LuaJIT"] = "JIT";
})(LuaTarget = exports.LuaTarget || (exports.LuaTarget = {}));
var BuildMode;
(function (BuildMode) {
    BuildMode["Default"] = "default";
    BuildMode["Library"] = "library";
})(BuildMode = exports.BuildMode || (exports.BuildMode = {}));
const isBundleEnabled = (options) => options.luaBundle !== undefined && options.luaBundleEntry !== undefined;
exports.isBundleEnabled = isBundleEnabled;
function validateOptions(options) {
    const diagnostics = [];
    if (options.luaBundle && !options.luaBundleEntry) {
        diagnostics.push(diagnosticFactories.luaBundleEntryIsRequired());
    }
    if (options.luaBundle && options.luaLibImport === LuaLibImportKind.Inline) {
        diagnostics.push(diagnosticFactories.usingLuaBundleWithInlineMightGenerateDuplicateCode());
    }
    if (options.luaBundle && options.buildMode === BuildMode.Library) {
        diagnostics.push(diagnosticFactories.cannotBundleLibrary());
    }
    if (options.jsx && options.jsx !== typescript_1.JsxEmit.React) {
        diagnostics.push(diagnosticFactories.unsupportedJsxEmit());
    }
    if (options.paths && !options.baseUrl) {
        diagnostics.push(diagnosticFactories.pathsWithoutBaseUrl());
    }
    return diagnostics;
}
exports.validateOptions = validateOptions;
//# sourceMappingURL=CompilerOptions.js.map
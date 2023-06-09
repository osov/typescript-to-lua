"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSafeName = exports.hasUnsafeIdentifierName = exports.hasUnsafeSymbolName = exports.isUnsafeName = exports.luaKeywords = exports.isValidLuaIdentifier = exports.shouldAllowUnicode = void 0;
const __1 = require("../..");
const diagnostics_1 = require("./diagnostics");
const export_1 = require("./export");
const typescript_1 = require("./typescript");
const shouldAllowUnicode = (options) => options.luaTarget === __1.LuaTarget.LuaJIT;
exports.shouldAllowUnicode = shouldAllowUnicode;
const isValidLuaIdentifier = (name, options) => !exports.luaKeywords.has(name) &&
    ((0, exports.shouldAllowUnicode)(options)
        ? /^[a-zA-Z_\u007F-\uFFFD][a-zA-Z0-9_\u007F-\uFFFD]*$/
        : /^[a-zA-Z_][a-zA-Z0-9_]*$/).test(name);
exports.isValidLuaIdentifier = isValidLuaIdentifier;
exports.luaKeywords = new Set([
    "and",
    "break",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "goto",
    "if",
    "in",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "return",
    "then",
    "true",
    "until",
    "while",
]);
const luaBuiltins = new Set([
    "_G",
    "assert",
    "coroutine",
    "debug",
    "error",
    "ipairs",
    "math",
    "pairs",
    "pcall",
    "print",
    "rawget",
    "repeat",
    "require",
    "self",
    "string",
    "table",
    "tostring",
    "type",
    "unpack",
]);
const isUnsafeName = (name, options) => !(0, exports.isValidLuaIdentifier)(name, options) || luaBuiltins.has(name);
exports.isUnsafeName = isUnsafeName;
function checkName(context, name, node) {
    const isInvalid = !(0, exports.isValidLuaIdentifier)(name, context.options);
    if (isInvalid) {
        // Empty identifier is a TypeScript error
        if (name !== "") {
            context.diagnostics.push((0, diagnostics_1.invalidAmbientIdentifierName)(node, name));
        }
    }
    return isInvalid;
}
function hasUnsafeSymbolName(context, symbol, tsOriginal) {
    var _a, _b;
    const isAmbient = (_b = (_a = symbol.declarations) === null || _a === void 0 ? void 0 : _a.some(d => (0, typescript_1.isAmbientNode)(d))) !== null && _b !== void 0 ? _b : false;
    // Catch ambient declarations of identifiers with bad names
    if (isAmbient && checkName(context, symbol.name, tsOriginal)) {
        return true;
    }
    // only unsafe when non-ambient and not exported
    return (0, exports.isUnsafeName)(symbol.name, context.options) && !isAmbient && !(0, export_1.isSymbolExported)(context, symbol);
}
exports.hasUnsafeSymbolName = hasUnsafeSymbolName;
function hasUnsafeIdentifierName(context, identifier, symbol) {
    if (symbol) {
        return hasUnsafeSymbolName(context, symbol, identifier);
    }
    return checkName(context, identifier.text, identifier);
}
exports.hasUnsafeIdentifierName = hasUnsafeIdentifierName;
const fixInvalidLuaIdentifier = (name) => name.replace(/[^a-zA-Z0-9_]/g, c => `_${c.charCodeAt(0).toString(16).toUpperCase()}`);
const createSafeName = (name) => "____" + fixInvalidLuaIdentifier(name);
exports.createSafeName = createSafeName;
//# sourceMappingURL=safe-names.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformContinueStatement = exports.transformBreakStatement = void 0;
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const diagnostics_1 = require("../utils/diagnostics");
const scope_1 = require("../utils/scope");
const transformBreakStatement = (breakStatement, context) => {
    void context;
    return lua.createBreakStatement(breakStatement);
};
exports.transformBreakStatement = transformBreakStatement;
const transformContinueStatement = (statement, context) => {
    var _a;
    if (context.luaTarget === CompilerOptions_1.LuaTarget.Universal ||
        context.luaTarget === CompilerOptions_1.LuaTarget.Lua50 ||
        context.luaTarget === CompilerOptions_1.LuaTarget.Lua51) {
        context.diagnostics.push((0, diagnostics_1.unsupportedForTarget)(statement, "Continue statement", context.luaTarget));
    }
    const scope = (0, scope_1.findScope)(context, scope_1.ScopeType.Loop);
    if (scope) {
        scope.loopContinued = true;
    }
    return lua.createGotoStatement(`__continue${(_a = scope === null || scope === void 0 ? void 0 : scope.id) !== null && _a !== void 0 ? _a : ""}`, statement);
};
exports.transformContinueStatement = transformContinueStatement;
//# sourceMappingURL=break-continue.js.map
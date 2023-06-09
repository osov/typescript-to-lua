"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSpreadElement = exports.isOptimizedVarArgSpread = void 0;
const ts = require("typescript");
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const utils_1 = require("../../utils");
const language_extensions_1 = require("../utils/language-extensions");
const lua_ast_1 = require("../utils/lua-ast");
const lualib_1 = require("../utils/lualib");
const scope_1 = require("../utils/scope");
const typescript_1 = require("../utils/typescript");
const multi_1 = require("./language-extensions/multi");
const vararg_1 = require("./language-extensions/vararg");
function isOptimizedVarArgSpread(context, symbol, identifier) {
    var _a;
    if (!ts.isSpreadElement((0, typescript_1.findFirstNonOuterParent)(identifier))) {
        return false;
    }
    // Walk up, stopping at any scope types which could stop optimization
    const scope = (0, scope_1.findScope)(context, scope_1.ScopeType.Function | scope_1.ScopeType.Try | scope_1.ScopeType.Catch | scope_1.ScopeType.File);
    if (!scope) {
        return;
    }
    // $vararg global constant
    if ((0, vararg_1.isGlobalVarargConstant)(context, symbol, scope)) {
        return true;
    }
    // Scope must be a function scope associated with a real ts function
    if (!(0, scope_1.isFunctionScopeWithDefinition)(scope)) {
        return false;
    }
    // Scope cannot be an async function
    if (ts.canHaveModifiers(scope.node) &&
        ((_a = ts.getModifiers(scope.node)) === null || _a === void 0 ? void 0 : _a.some(m => m.kind === ts.SyntaxKind.AsyncKeyword))) {
        return false;
    }
    // Identifier must be a vararg in the local function scope's parameters
    const isSpreadParameter = (p) => p.dotDotDotToken && ts.isIdentifier(p.name) && context.checker.getSymbolAtLocation(p.name) === symbol;
    if (!scope.node.parameters.some(isSpreadParameter)) {
        return false;
    }
    // De-optimize if already referenced outside of a spread, as the array may have been modified
    if ((0, scope_1.hasReferencedSymbol)(context, scope, symbol)) {
        return false;
    }
    // De-optimize if a function is being hoisted from below to above, as it may have modified the array
    if ((0, scope_1.hasReferencedUndefinedLocalFunction)(context, scope)) {
        return false;
    }
    return true;
}
exports.isOptimizedVarArgSpread = isOptimizedVarArgSpread;
// TODO: Currently it's also used as an array member
const transformSpreadElement = (node, context) => {
    const tsInnerExpression = ts.skipOuterExpressions(node.expression);
    if (ts.isIdentifier(tsInnerExpression)) {
        const symbol = context.checker.getSymbolAtLocation(tsInnerExpression);
        if (symbol && isOptimizedVarArgSpread(context, symbol, tsInnerExpression)) {
            return context.luaTarget === CompilerOptions_1.LuaTarget.Lua50
                ? (0, lua_ast_1.createUnpackCall)(context, lua.createArgLiteral(), node)
                : lua.createDotsLiteral(node);
        }
    }
    const innerExpression = context.transformExpression(node.expression);
    if ((0, multi_1.isMultiReturnCall)(context, tsInnerExpression))
        return innerExpression;
    const iterableExtensionType = (0, language_extensions_1.getIterableExtensionKindForNode)(context, node.expression);
    if (iterableExtensionType) {
        if (iterableExtensionType === language_extensions_1.IterableExtensionKind.Iterable) {
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.LuaIteratorSpread, node, innerExpression);
        }
        else if (iterableExtensionType === language_extensions_1.IterableExtensionKind.Pairs) {
            const objectEntries = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ObjectEntries, node, innerExpression);
            return (0, lua_ast_1.createUnpackCall)(context, objectEntries, node);
        }
        else if (iterableExtensionType === language_extensions_1.IterableExtensionKind.PairsKey) {
            const objectKeys = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ObjectKeys, node, innerExpression);
            return (0, lua_ast_1.createUnpackCall)(context, objectKeys, node);
        }
        else {
            (0, utils_1.assertNever)(iterableExtensionType);
        }
    }
    const type = context.checker.getTypeAtLocation(node.expression); // not ts-inner expression, in case of casts
    if ((0, typescript_1.isArrayType)(context, type)) {
        return (0, lua_ast_1.createUnpackCall)(context, innerExpression, node);
    }
    return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.Spread, node, innerExpression);
};
exports.transformSpreadElement = transformSpreadElement;
//# sourceMappingURL=spread.js.map
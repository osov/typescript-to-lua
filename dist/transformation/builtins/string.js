"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformStringProperty = exports.transformStringConstructorCall = exports.transformStringPrototypeCall = void 0;
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const diagnostics_1 = require("../utils/diagnostics");
const lua_ast_1 = require("../utils/lua-ast");
const lualib_1 = require("../utils/lualib");
const call_1 = require("../visitors/call");
function createStringCall(methodName, tsOriginal, ...params) {
    const stringIdentifier = lua.createIdentifier("string");
    return lua.createCallExpression(lua.createTableIndexExpression(stringIdentifier, lua.createStringLiteral(methodName)), params, tsOriginal);
}
function transformStringPrototypeCall(context, node, calledMethod) {
    var _a, _b, _c, _d;
    const signature = context.checker.getResolvedSignature(node);
    const [caller, params] = (0, call_1.transformCallAndArguments)(context, calledMethod.expression, node.arguments, signature);
    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "replace":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringReplace, node, caller, ...params);
        case "replaceAll":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringReplaceAll, node, caller, ...params);
        case "concat":
            return lua.createCallExpression(lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("concat")), [(0, lua_ast_1.wrapInTable)(caller, ...params)], node);
        case "indexOf": {
            const stringExpression = createStringCall("find", node, caller, (_a = params[0]) !== null && _a !== void 0 ? _a : lua.createNilLiteral(), params[1]
                ? // string.find handles negative indexes by making it relative to string end, but for indexOf it's the same as 0
                    lua.createCallExpression(lua.createTableIndexExpression(lua.createIdentifier("math"), lua.createStringLiteral("max")), [(0, lua_ast_1.addToNumericExpression)(params[1], 1), lua.createNumericLiteral(1)])
                : lua.createNilLiteral(), lua.createBooleanLiteral(true));
            return lua.createBinaryExpression(lua.createBinaryExpression(stringExpression, lua.createNumericLiteral(0), lua.SyntaxKind.OrOperator), lua.createNumericLiteral(1), lua.SyntaxKind.SubtractionOperator, node);
        }
        case "substr":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringSubstr, node, caller, ...params);
        case "substring":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringSubstring, node, caller, ...params);
        case "slice": {
            const literalArg1 = (0, lua_ast_1.getNumberLiteralValue)(params[0]);
            if (params[0] && literalArg1 !== undefined) {
                let stringSubArgs = [
                    (0, lua_ast_1.addToNumericExpression)(params[0], literalArg1 < 0 ? 0 : 1),
                ];
                if (params[1]) {
                    const literalArg2 = (0, lua_ast_1.getNumberLiteralValue)(params[1]);
                    if (literalArg2 !== undefined) {
                        stringSubArgs.push((0, lua_ast_1.addToNumericExpression)(params[1], literalArg2 < 0 ? -1 : 0));
                    }
                    else {
                        stringSubArgs = undefined;
                    }
                }
                // Inline string.sub call if we know that both parameters are pure and aren't negative
                if (stringSubArgs) {
                    return createStringCall("sub", node, caller, ...stringSubArgs);
                }
            }
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringSlice, node, caller, ...params);
        }
        case "toLowerCase":
            return createStringCall("lower", node, caller);
        case "toUpperCase":
            return createStringCall("upper", node, caller);
        case "trim":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringTrim, node, caller);
        case "trimEnd":
        case "trimRight":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringTrimEnd, node, caller);
        case "trimStart":
        case "trimLeft":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringTrimStart, node, caller);
        case "split":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringSplit, node, caller, ...params);
        case "charAt": {
            const literalValue = (0, lua_ast_1.getNumberLiteralValue)(params[0]);
            // Inline string.sub call if we know that parameter is pure and isn't negative
            if (literalValue !== undefined && literalValue >= 0) {
                const firstParamPlusOne = (0, lua_ast_1.addToNumericExpression)((_b = params[0]) !== null && _b !== void 0 ? _b : lua.createNilLiteral(), 1);
                return createStringCall("sub", node, caller, firstParamPlusOne, firstParamPlusOne);
            }
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringCharAt, node, caller, ...params);
        }
        case "charCodeAt": {
            const literalValue = (0, lua_ast_1.getNumberLiteralValue)(params[0]);
            // Inline string.sub call if we know that parameter is pure and isn't negative
            if (literalValue !== undefined && literalValue >= 0) {
                return lua.createBinaryExpression(createStringCall("byte", node, caller, (0, lua_ast_1.addToNumericExpression)((_c = params[0]) !== null && _c !== void 0 ? _c : lua.createNilLiteral(), 1)), (0, lua_ast_1.createNaN)(), lua.SyntaxKind.OrOperator);
            }
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringCharCodeAt, node, caller, ...params);
        }
        case "startsWith":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringStartsWith, node, caller, ...params);
        case "endsWith":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringEndsWith, node, caller, ...params);
        case "includes":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringIncludes, node, caller, ...params);
        case "repeat":
            const math = lua.createIdentifier("math");
            const floor = lua.createStringLiteral("floor");
            const parameter = lua.createCallExpression(lua.createTableIndexExpression(math, floor), [
                (_d = params[0]) !== null && _d !== void 0 ? _d : lua.createNilLiteral(),
            ]);
            return createStringCall("rep", node, caller, parameter);
        case "padStart":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringPadStart, node, caller, ...params);
        case "padEnd":
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringPadEnd, node, caller, ...params);
        case "toString":
            return; // will be handled by transformObjectPrototypeCall
        default:
            context.diagnostics.push((0, diagnostics_1.unsupportedProperty)(calledMethod.name, "string", expressionName));
    }
}
exports.transformStringPrototypeCall = transformStringPrototypeCall;
function transformStringConstructorCall(context, node, calledMethod) {
    const signature = context.checker.getResolvedSignature(node);
    const params = (0, call_1.transformArguments)(context, node.arguments, signature);
    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "fromCharCode":
            return lua.createCallExpression(lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("char")), params, node);
        default:
            context.diagnostics.push((0, diagnostics_1.unsupportedProperty)(calledMethod.name, "String", expressionName));
    }
}
exports.transformStringConstructorCall = transformStringConstructorCall;
function transformStringProperty(context, node) {
    switch (node.name.text) {
        case "length":
            const expression = context.transformExpression(node.expression);
            if (context.luaTarget === CompilerOptions_1.LuaTarget.Lua50) {
                const stringLen = lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("len"));
                return lua.createCallExpression(stringLen, [expression], node);
            }
            else {
                return lua.createUnaryExpression(expression, lua.SyntaxKind.LengthOperator, node);
            }
        default:
            context.diagnostics.push((0, diagnostics_1.unsupportedProperty)(node.name, "string", node.name.text));
    }
}
exports.transformStringProperty = transformStringProperty;
//# sourceMappingURL=string.js.map
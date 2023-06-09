"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMathCall = exports.transformMathProperty = void 0;
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const diagnostics_1 = require("../utils/diagnostics");
const lualib_1 = require("../utils/lualib");
const call_1 = require("../visitors/call");
function transformMathProperty(context, node) {
    const name = node.name.text;
    switch (name) {
        case "PI":
            const property = lua.createStringLiteral("pi", node.name);
            const math = lua.createIdentifier("math", node.expression);
            return lua.createTableIndexExpression(math, property, node);
        case "E":
        case "LN10":
        case "LN2":
        case "LOG10E":
        case "LOG2E":
        case "SQRT1_2":
        case "SQRT2":
            return lua.createNumericLiteral(Math[name], node);
        default:
            context.diagnostics.push((0, diagnostics_1.unsupportedProperty)(node.name, "Math", name));
    }
}
exports.transformMathProperty = transformMathProperty;
function transformMathCall(context, node, calledMethod) {
    var _a, _b, _c, _d;
    const signature = context.checker.getResolvedSignature(node);
    const params = (0, call_1.transformArguments)(context, node.arguments, signature);
    const math = lua.createIdentifier("math");
    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        // Lua 5.3: math.atan(y, x)
        // Otherwise: math.atan2(y, x)
        case "atan2": {
            if (context.luaTarget === CompilerOptions_1.LuaTarget.Universal) {
                return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.MathAtan2, node, ...params);
            }
            const method = lua.createStringLiteral(context.luaTarget === CompilerOptions_1.LuaTarget.Lua53 ? "atan" : "atan2");
            return lua.createCallExpression(lua.createTableIndexExpression(math, method), params, node);
        }
        // (math.log(x) / Math.LNe)
        case "log10":
        case "log2": {
            const log1 = lua.createTableIndexExpression(math, lua.createStringLiteral("log"));
            const logCall1 = lua.createCallExpression(log1, params);
            const e = lua.createNumericLiteral(expressionName === "log10" ? Math.LN10 : Math.LN2);
            return lua.createBinaryExpression(logCall1, e, lua.SyntaxKind.DivisionOperator, node);
        }
        // math.log(1 + x)
        case "log1p": {
            const log = lua.createStringLiteral("log");
            const one = lua.createNumericLiteral(1);
            const add = lua.createBinaryExpression(one, (_a = params[0]) !== null && _a !== void 0 ? _a : lua.createNilLiteral(), lua.SyntaxKind.AdditionOperator);
            return lua.createCallExpression(lua.createTableIndexExpression(math, log), [add], node);
        }
        case "pow": {
            // Translate to base ^ power
            return lua.createBinaryExpression((_b = params[0]) !== null && _b !== void 0 ? _b : lua.createNilLiteral(), (_c = params[1]) !== null && _c !== void 0 ? _c : lua.createNilLiteral(), lua.SyntaxKind.PowerOperator, node);
        }
        // math.floor(x + 0.5)
        case "round": {
            const floor = lua.createStringLiteral("floor");
            const half = lua.createNumericLiteral(0.5);
            const add = lua.createBinaryExpression((_d = params[0]) !== null && _d !== void 0 ? _d : lua.createNilLiteral(), half, lua.SyntaxKind.AdditionOperator);
            return lua.createCallExpression(lua.createTableIndexExpression(math, floor), [add], node);
        }
        case "sign": {
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.MathSign, node, ...params);
        }
        case "abs":
        case "acos":
        case "asin":
        case "atan":
        case "ceil":
        case "cos":
        case "exp":
        case "floor":
        case "log":
        case "max":
        case "min":
        case "random":
        case "sin":
        case "sqrt":
        case "tan": {
            const method = lua.createStringLiteral(expressionName);
            return lua.createCallExpression(lua.createTableIndexExpression(math, method), params, node);
        }
        default:
            context.diagnostics.push((0, diagnostics_1.unsupportedProperty)(calledMethod.name, "Math", expressionName));
    }
}
exports.transformMathCall = transformMathCall;
//# sourceMappingURL=math.js.map
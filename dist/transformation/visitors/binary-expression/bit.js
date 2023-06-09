"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformUnaryBitOperation = exports.transformBinaryBitOperation = exports.isBitOperator = void 0;
const ts = require("typescript");
const CompilerOptions_1 = require("../../../CompilerOptions");
const lua = require("../../../LuaAST");
const utils_1 = require("../../../utils");
const diagnostics_1 = require("../../utils/diagnostics");
const isBitOperator = (operator) => operator in bitOperatorToLibOperation;
exports.isBitOperator = isBitOperator;
const bitOperatorToLibOperation = {
    [ts.SyntaxKind.AmpersandToken]: "band",
    [ts.SyntaxKind.BarToken]: "bor",
    [ts.SyntaxKind.CaretToken]: "bxor",
    [ts.SyntaxKind.LessThanLessThanToken]: "lshift",
    [ts.SyntaxKind.GreaterThanGreaterThanToken]: "arshift",
    [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken]: "rshift",
};
function transformBinaryBitLibOperation(node, left, right, operator, lib) {
    const functionName = bitOperatorToLibOperation[operator];
    return lua.createCallExpression(lua.createTableIndexExpression(lua.createIdentifier(lib), lua.createStringLiteral(functionName)), [left, right], node);
}
function transformBitOperatorToLuaOperator(context, node, operator) {
    switch (operator) {
        case ts.SyntaxKind.BarToken:
            return lua.SyntaxKind.BitwiseOrOperator;
        case ts.SyntaxKind.CaretToken:
            return lua.SyntaxKind.BitwiseExclusiveOrOperator;
        case ts.SyntaxKind.AmpersandToken:
            return lua.SyntaxKind.BitwiseAndOperator;
        case ts.SyntaxKind.LessThanLessThanToken:
            return lua.SyntaxKind.BitwiseLeftShiftOperator;
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
            context.diagnostics.push((0, diagnostics_1.unsupportedRightShiftOperator)(node));
            return lua.SyntaxKind.BitwiseRightShiftOperator;
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            return lua.SyntaxKind.BitwiseRightShiftOperator;
    }
}
function transformBinaryBitOperation(context, node, left, right, operator) {
    switch (context.luaTarget) {
        case CompilerOptions_1.LuaTarget.Universal:
        case CompilerOptions_1.LuaTarget.Lua50:
        case CompilerOptions_1.LuaTarget.Lua51:
            context.diagnostics.push((0, diagnostics_1.unsupportedForTarget)(node, "Bitwise operations", context.luaTarget));
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");
        case CompilerOptions_1.LuaTarget.LuaJIT:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit");
        case CompilerOptions_1.LuaTarget.Lua52:
            return transformBinaryBitLibOperation(node, left, right, operator, "bit32");
        default:
            const luaOperator = transformBitOperatorToLuaOperator(context, node, operator);
            return lua.createBinaryExpression(left, right, luaOperator, node);
    }
}
exports.transformBinaryBitOperation = transformBinaryBitOperation;
function transformUnaryBitLibOperation(node, expression, operator, lib) {
    let bitFunction;
    switch (operator) {
        case lua.SyntaxKind.BitwiseNotOperator:
            bitFunction = "bnot";
            break;
        default:
            (0, utils_1.assertNever)(operator);
    }
    return lua.createCallExpression(lua.createTableIndexExpression(lua.createIdentifier(lib), lua.createStringLiteral(bitFunction)), [expression], node);
}
function transformUnaryBitOperation(context, node, expression, operator) {
    switch (context.luaTarget) {
        case CompilerOptions_1.LuaTarget.Universal:
        case CompilerOptions_1.LuaTarget.Lua50:
        case CompilerOptions_1.LuaTarget.Lua51:
            context.diagnostics.push((0, diagnostics_1.unsupportedForTarget)(node, "Bitwise operations", context.luaTarget));
            return transformUnaryBitLibOperation(node, expression, operator, "bit");
        case CompilerOptions_1.LuaTarget.LuaJIT:
            return transformUnaryBitLibOperation(node, expression, operator, "bit");
        case CompilerOptions_1.LuaTarget.Lua52:
            return transformUnaryBitLibOperation(node, expression, operator, "bit32");
        default:
            return lua.createUnaryExpression(expression, operator, node);
    }
}
exports.transformUnaryBitOperation = transformUnaryBitOperation;
//# sourceMappingURL=bit.js.map
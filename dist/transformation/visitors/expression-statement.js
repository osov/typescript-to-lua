"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapInStatement = exports.transformExpressionStatement = void 0;
const lua = require("../../LuaAST");
const context_1 = require("../context");
const binary_expression_1 = require("./binary-expression");
const unary_expression_1 = require("./unary-expression");
const transformExpressionStatement = (node, context) => {
    const unaryExpressionResult = (0, unary_expression_1.transformUnaryExpressionStatement)(context, node);
    if (unaryExpressionResult) {
        return unaryExpressionResult;
    }
    const binaryExpressionResult = (0, binary_expression_1.transformBinaryExpressionStatement)(context, node);
    if (binaryExpressionResult) {
        return binaryExpressionResult;
    }
    return wrapInStatement(context.transformExpression(node.expression));
};
exports.transformExpressionStatement = transformExpressionStatement;
function wrapInStatement(result) {
    const isTempVariable = lua.isIdentifier(result) && result.symbolId === context_1.tempSymbolId;
    if (isTempVariable) {
        return undefined;
    }
    // "synthetic": no side effects and no original source
    const isSyntheticExpression = (lua.isIdentifier(result) || lua.isLiteral(result)) && result.line === undefined;
    if (isSyntheticExpression) {
        return undefined;
    }
    if (lua.isCallExpression(result) || lua.isMethodCallExpression(result)) {
        return lua.createExpressionStatement(result);
    }
    // Assign expression statements to dummy to make sure they're legal Lua
    return lua.createVariableDeclarationStatement(lua.createAnonymousIdentifier(), result);
}
exports.wrapInStatement = wrapInStatement;
//# sourceMappingURL=expression-statement.js.map
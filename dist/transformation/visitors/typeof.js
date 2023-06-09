"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformTypeOfBinaryExpression = exports.transformTypeOfExpression = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const LuaLib_1 = require("../../LuaLib");
const lualib_1 = require("../utils/lualib");
const binary_expression_1 = require("./binary-expression");
const transformTypeOfExpression = (node, context) => {
    const innerExpression = context.transformExpression(node.expression);
    return (0, lualib_1.transformLuaLibFunction)(context, LuaLib_1.LuaLibFeature.TypeOf, node, innerExpression);
};
exports.transformTypeOfExpression = transformTypeOfExpression;
function transformTypeOfBinaryExpression(context, node) {
    const operator = node.operatorToken.kind;
    if (operator !== ts.SyntaxKind.EqualsEqualsToken &&
        operator !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
        operator !== ts.SyntaxKind.ExclamationEqualsToken &&
        operator !== ts.SyntaxKind.ExclamationEqualsEqualsToken) {
        return;
    }
    let literalExpression;
    let typeOfExpression;
    if (ts.isTypeOfExpression(node.left)) {
        typeOfExpression = node.left;
        literalExpression = node.right;
    }
    else if (ts.isTypeOfExpression(node.right)) {
        typeOfExpression = node.right;
        literalExpression = node.left;
    }
    else {
        return;
    }
    const comparedExpression = context.transformExpression(literalExpression);
    if (!lua.isStringLiteral(comparedExpression))
        return;
    if (comparedExpression.value === "object") {
        comparedExpression.value = "table";
    }
    else if (comparedExpression.value === "undefined") {
        comparedExpression.value = "nil";
    }
    const innerExpression = context.transformExpression(typeOfExpression.expression);
    const typeCall = lua.createCallExpression(lua.createIdentifier("type"), [innerExpression], typeOfExpression);
    const { precedingStatements, result } = (0, binary_expression_1.transformBinaryOperation)(context, typeCall, comparedExpression, [], operator, node);
    context.addPrecedingStatements(precedingStatements);
    return result;
}
exports.transformTypeOfBinaryExpression = transformTypeOfBinaryExpression;
//# sourceMappingURL=typeof.js.map
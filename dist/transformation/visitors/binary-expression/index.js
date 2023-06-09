"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformBinaryExpressionStatement = exports.transformBinaryExpression = exports.transformBinaryOperation = exports.createShortCircuitBinaryExpressionPrecedingStatements = void 0;
const ts = require("typescript");
const CompilerOptions_1 = require("../../../CompilerOptions");
const lua = require("../../../LuaAST");
const lua_ast_1 = require("../../utils/lua-ast");
const lualib_1 = require("../../utils/lualib");
const typescript_1 = require("../../utils/typescript");
const typeof_1 = require("../typeof");
const assignments_1 = require("./assignments");
const bit_1 = require("./bit");
const compound_1 = require("./compound");
const utils_1 = require("../../../utils");
const expression_list_1 = require("../expression-list");
const preceding_statements_1 = require("../../utils/preceding-statements");
const isShortCircuitOperator = (value) => value === ts.SyntaxKind.AmpersandAmpersandToken ||
    value === ts.SyntaxKind.BarBarToken ||
    value === ts.SyntaxKind.QuestionQuestionToken;
const simpleOperatorsToLua = {
    [ts.SyntaxKind.AmpersandAmpersandToken]: lua.SyntaxKind.AndOperator,
    [ts.SyntaxKind.BarBarToken]: lua.SyntaxKind.OrOperator,
    [ts.SyntaxKind.PlusToken]: lua.SyntaxKind.AdditionOperator,
    [ts.SyntaxKind.MinusToken]: lua.SyntaxKind.SubtractionOperator,
    [ts.SyntaxKind.AsteriskToken]: lua.SyntaxKind.MultiplicationOperator,
    [ts.SyntaxKind.AsteriskAsteriskToken]: lua.SyntaxKind.PowerOperator,
    [ts.SyntaxKind.SlashToken]: lua.SyntaxKind.DivisionOperator,
    [ts.SyntaxKind.PercentToken]: lua.SyntaxKind.ModuloOperator,
    [ts.SyntaxKind.GreaterThanToken]: lua.SyntaxKind.GreaterThanOperator,
    [ts.SyntaxKind.GreaterThanEqualsToken]: lua.SyntaxKind.GreaterEqualOperator,
    [ts.SyntaxKind.LessThanToken]: lua.SyntaxKind.LessThanOperator,
    [ts.SyntaxKind.LessThanEqualsToken]: lua.SyntaxKind.LessEqualOperator,
    [ts.SyntaxKind.EqualsEqualsToken]: lua.SyntaxKind.EqualityOperator,
    [ts.SyntaxKind.EqualsEqualsEqualsToken]: lua.SyntaxKind.EqualityOperator,
    [ts.SyntaxKind.ExclamationEqualsToken]: lua.SyntaxKind.InequalityOperator,
    [ts.SyntaxKind.ExclamationEqualsEqualsToken]: lua.SyntaxKind.InequalityOperator,
};
function transformBinaryOperationWithNoPrecedingStatements(context, left, right, operator, node) {
    if ((0, bit_1.isBitOperator)(operator)) {
        return (0, bit_1.transformBinaryBitOperation)(context, node, left, right, operator);
    }
    if (operator === ts.SyntaxKind.QuestionQuestionToken) {
        (0, utils_1.assert)(ts.isBinaryExpression(node));
        return transformNullishCoalescingOperationNoPrecedingStatements(context, node, left, right);
    }
    if (operator === ts.SyntaxKind.PercentToken && context.luaTarget === CompilerOptions_1.LuaTarget.Lua50) {
        const mathMod = lua.createTableIndexExpression(lua.createIdentifier("math"), lua.createStringLiteral("mod"));
        return lua.createCallExpression(mathMod, [left, right], node);
    }
    let luaOperator = simpleOperatorsToLua[operator];
    // Check if we need to use string concat operator
    if (operator === ts.SyntaxKind.PlusToken && ts.isBinaryExpression(node)) {
        const typeLeft = context.checker.getTypeAtLocation(node.left);
        const typeRight = context.checker.getTypeAtLocation(node.right);
        const isLeftString = (0, typescript_1.isStringType)(context, typeLeft);
        const isRightString = (0, typescript_1.isStringType)(context, typeRight);
        if (isLeftString || isRightString) {
            left = isLeftString ? left : (0, lua_ast_1.wrapInToStringForConcat)(left);
            right = isRightString ? right : (0, lua_ast_1.wrapInToStringForConcat)(right);
            luaOperator = lua.SyntaxKind.ConcatOperator;
        }
    }
    return lua.createBinaryExpression(left, right, luaOperator, node);
}
function createShortCircuitBinaryExpressionPrecedingStatements(context, lhs, rhs, rightPrecedingStatements, operator, node) {
    const conditionIdentifier = context.createTempNameForLuaExpression(lhs);
    const assignmentStatement = lua.createVariableDeclarationStatement(conditionIdentifier, lhs, node === null || node === void 0 ? void 0 : node.left);
    let condition;
    switch (operator) {
        case ts.SyntaxKind.BarBarToken:
            condition = lua.createUnaryExpression(lua.cloneIdentifier(conditionIdentifier), lua.SyntaxKind.NotOperator, node);
            break;
        case ts.SyntaxKind.AmpersandAmpersandToken:
            condition = lua.cloneIdentifier(conditionIdentifier);
            break;
        case ts.SyntaxKind.QuestionQuestionToken:
            condition = lua.createBinaryExpression(lua.cloneIdentifier(conditionIdentifier), lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator, node);
            break;
    }
    const ifStatement = lua.createIfStatement(condition, lua.createBlock([...rightPrecedingStatements, lua.createAssignmentStatement(conditionIdentifier, rhs)]), undefined, node === null || node === void 0 ? void 0 : node.left);
    return { precedingStatements: [assignmentStatement, ifStatement], result: conditionIdentifier };
}
exports.createShortCircuitBinaryExpressionPrecedingStatements = createShortCircuitBinaryExpressionPrecedingStatements;
function transformShortCircuitBinaryExpression(context, node, operator) {
    const lhs = context.transformExpression(node.left);
    const { precedingStatements, result } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(node.right));
    return transformBinaryOperation(context, lhs, result, precedingStatements, operator, node);
}
function transformBinaryOperation(context, left, right, rightPrecedingStatements, operator, node) {
    if (rightPrecedingStatements.length > 0 && isShortCircuitOperator(operator)) {
        (0, utils_1.assert)(ts.isBinaryExpression(node));
        return createShortCircuitBinaryExpressionPrecedingStatements(context, left, right, rightPrecedingStatements, operator, node);
    }
    return {
        precedingStatements: rightPrecedingStatements,
        result: transformBinaryOperationWithNoPrecedingStatements(context, left, right, operator, node),
    };
}
exports.transformBinaryOperation = transformBinaryOperation;
const transformBinaryExpression = (node, context) => {
    const operator = node.operatorToken.kind;
    const typeOfResult = (0, typeof_1.transformTypeOfBinaryExpression)(context, node);
    if (typeOfResult) {
        return typeOfResult;
    }
    if ((0, compound_1.isCompoundAssignmentToken)(operator)) {
        const token = (0, compound_1.unwrapCompoundAssignmentToken)(operator);
        return (0, compound_1.transformCompoundAssignmentExpression)(context, node, node.left, node.right, token, false);
    }
    switch (operator) {
        case ts.SyntaxKind.EqualsToken:
            return (0, assignments_1.transformAssignmentExpression)(context, node);
        case ts.SyntaxKind.InKeyword: {
            const lhs = context.transformExpression(node.left);
            const rhs = context.transformExpression(node.right);
            const indexExpression = lua.createTableIndexExpression(rhs, lhs);
            return lua.createBinaryExpression(indexExpression, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator, node);
        }
        case ts.SyntaxKind.InstanceOfKeyword: {
            const lhs = context.transformExpression(node.left);
            const rhs = context.transformExpression(node.right);
            const rhsType = context.checker.getTypeAtLocation(node.right);
            if ((0, typescript_1.isStandardLibraryType)(context, rhsType, "ObjectConstructor")) {
                return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.InstanceOfObject, node, lhs);
            }
            return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.InstanceOf, node, lhs, rhs);
        }
        case ts.SyntaxKind.CommaToken: {
            const statements = context.transformStatements(ts.factory.createExpressionStatement(node.left));
            const { precedingStatements, result } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(node.right));
            statements.push(...precedingStatements);
            context.addPrecedingStatements(statements);
            return result;
        }
        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.BarBarToken: {
            const { precedingStatements, result } = transformShortCircuitBinaryExpression(context, node, operator);
            context.addPrecedingStatements(precedingStatements);
            return result;
        }
    }
    const { precedingStatements: orderedExpressionPrecedingStatements, result: [lhs, rhs], } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, expression_list_1.transformOrderedExpressions)(context, [node.left, node.right]));
    const { precedingStatements, result } = transformBinaryOperation(context, lhs, rhs, orderedExpressionPrecedingStatements, operator, node);
    context.addPrecedingStatements(precedingStatements);
    return result;
};
exports.transformBinaryExpression = transformBinaryExpression;
function transformBinaryExpressionStatement(context, node) {
    const expression = node.expression;
    if (!ts.isBinaryExpression(expression))
        return;
    const operator = expression.operatorToken.kind;
    if ((0, compound_1.isCompoundAssignmentToken)(operator)) {
        // +=, -=, etc...
        const token = (0, compound_1.unwrapCompoundAssignmentToken)(operator);
        return (0, compound_1.transformCompoundAssignmentStatement)(context, expression, expression.left, expression.right, token);
    }
    else if (operator === ts.SyntaxKind.EqualsToken) {
        return (0, assignments_1.transformAssignmentStatement)(context, expression);
    }
    else if (operator === ts.SyntaxKind.CommaToken) {
        const statements = [
            ...context.transformStatements(ts.factory.createExpressionStatement(expression.left)),
            ...context.transformStatements(ts.factory.createExpressionStatement(expression.right)),
        ];
        return lua.createDoStatement(statements, expression);
    }
}
exports.transformBinaryExpressionStatement = transformBinaryExpressionStatement;
function transformNullishCoalescingOperationNoPrecedingStatements(context, node, transformedLeft, transformedRight) {
    const lhsType = context.checker.getTypeAtLocation(node.left);
    // Check if we can take a shortcut to 'lhs or rhs' if the left-hand side cannot be 'false'.
    if ((0, typescript_1.canBeFalsyWhenNotNull)(context, lhsType)) {
        // reuse logic from case with preceding statements
        const { precedingStatements, result } = createShortCircuitBinaryExpressionPrecedingStatements(context, transformedLeft, transformedRight, [], ts.SyntaxKind.QuestionQuestionToken, node);
        context.addPrecedingStatements(precedingStatements);
        return result;
    }
    else {
        // lhs or rhs
        return lua.createBinaryExpression(transformedLeft, transformedRight, lua.SyntaxKind.OrOperator, node);
    }
}
//# sourceMappingURL=index.js.map
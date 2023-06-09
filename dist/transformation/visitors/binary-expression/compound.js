"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformCompoundAssignmentStatement = exports.transformCompoundAssignmentExpression = exports.unwrapCompoundAssignmentToken = exports.isCompoundAssignmentToken = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const utils_1 = require("../../../utils");
const preceding_statements_1 = require("../../utils/preceding-statements");
const index_1 = require("./index");
const assignments_1 = require("./assignments");
const destructuring_assignments_1 = require("./destructuring-assignments");
const lualib_1 = require("../../utils/lualib");
const diagnostics_1 = require("../../utils/diagnostics");
function isLuaExpressionWithSideEffect(expression) {
    return !(lua.isLiteral(expression) || lua.isIdentifier(expression));
}
function shouldCacheTableIndexExpressions(expression, rightPrecedingStatements) {
    return (isLuaExpressionWithSideEffect(expression.table) ||
        isLuaExpressionWithSideEffect(expression.index) ||
        rightPrecedingStatements.length > 0);
}
const compoundToAssignmentTokens = {
    [ts.SyntaxKind.BarEqualsToken]: ts.SyntaxKind.BarToken,
    [ts.SyntaxKind.PlusEqualsToken]: ts.SyntaxKind.PlusToken,
    [ts.SyntaxKind.CaretEqualsToken]: ts.SyntaxKind.CaretToken,
    [ts.SyntaxKind.MinusEqualsToken]: ts.SyntaxKind.MinusToken,
    [ts.SyntaxKind.SlashEqualsToken]: ts.SyntaxKind.SlashToken,
    [ts.SyntaxKind.PercentEqualsToken]: ts.SyntaxKind.PercentToken,
    [ts.SyntaxKind.AsteriskEqualsToken]: ts.SyntaxKind.AsteriskToken,
    [ts.SyntaxKind.AmpersandEqualsToken]: ts.SyntaxKind.AmpersandToken,
    [ts.SyntaxKind.AsteriskAsteriskEqualsToken]: ts.SyntaxKind.AsteriskAsteriskToken,
    [ts.SyntaxKind.LessThanLessThanEqualsToken]: ts.SyntaxKind.LessThanLessThanToken,
    [ts.SyntaxKind.GreaterThanGreaterThanEqualsToken]: ts.SyntaxKind.GreaterThanGreaterThanToken,
    [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken]: ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
    [ts.SyntaxKind.BarBarEqualsToken]: ts.SyntaxKind.BarBarToken,
    [ts.SyntaxKind.AmpersandAmpersandEqualsToken]: ts.SyntaxKind.AmpersandAmpersandToken,
    [ts.SyntaxKind.QuestionQuestionEqualsToken]: ts.SyntaxKind.QuestionQuestionToken,
};
const isCompoundAssignmentToken = (token) => token in compoundToAssignmentTokens;
exports.isCompoundAssignmentToken = isCompoundAssignmentToken;
const unwrapCompoundAssignmentToken = (token) => compoundToAssignmentTokens[token];
exports.unwrapCompoundAssignmentToken = unwrapCompoundAssignmentToken;
function transformCompoundAssignment(context, expression, lhs, rhs, operator, isPostfix) {
    if ((0, destructuring_assignments_1.isArrayLength)(context, lhs)) {
        const { precedingStatements, result: lengthSetterStatement } = transformCompoundLengthSetter(context, expression, lhs, rhs, operator);
        return { precedingStatements, result: lengthSetterStatement.expression };
    }
    const left = context.transformExpression(lhs);
    if (!lua.isAssignmentLeftHandSideExpression(left)) {
        context.diagnostics.push((0, diagnostics_1.cannotAssignToNodeOfKind)(expression, left.kind));
        return { precedingStatements: [], result: left };
    }
    const { precedingStatements: rightPrecedingStatements, result: right } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(rhs));
    if (lua.isTableIndexExpression(left)) {
        // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
        // local __obj, __index = ${objExpression}, ${indexExpression};
        const obj = context.createTempNameForLuaExpression(left.table);
        const index = context.createTempNameForLuaExpression(left.index);
        const objAndIndexDeclaration = lua.createVariableDeclarationStatement([obj, index], [left.table, left.index]);
        const accessExpression = lua.createTableIndexExpression(obj, index);
        const tmp = context.createTempNameForLuaExpression(left);
        if (isPostfix) {
            // local ____tmp = ____obj[____index];
            // ____obj[____index] = ____tmp ${replacementOperator} ${right};
            // return ____tmp
            const tmpDeclaration = lua.createVariableDeclarationStatement(tmp, accessExpression);
            const { precedingStatements, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, tmp, right, rightPrecedingStatements, operator, expression);
            const assignStatement = lua.createAssignmentStatement(accessExpression, operatorExpression);
            return {
                precedingStatements: [objAndIndexDeclaration, ...precedingStatements, tmpDeclaration, assignStatement],
                result: tmp,
            };
        }
        else {
            if (isSetterSkippingCompoundAssignmentOperator(operator)) {
                return {
                    precedingStatements: [
                        objAndIndexDeclaration,
                        ...transformSetterSkippingCompoundAssignment(accessExpression, operator, right, rightPrecedingStatements),
                    ],
                    result: left,
                };
            }
            // local ____tmp = ____obj[____index] ${replacementOperator} ${right};
            // ____obj[____index] = ____tmp;
            // return ____tmp
            const { precedingStatements, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, accessExpression, right, rightPrecedingStatements, operator, expression);
            const tmpDeclaration = lua.createVariableDeclarationStatement(tmp, operatorExpression);
            const assignStatement = lua.createAssignmentStatement(accessExpression, tmp);
            return {
                precedingStatements: [objAndIndexDeclaration, ...precedingStatements, tmpDeclaration, assignStatement],
                result: tmp,
            };
        }
    }
    else if (isPostfix) {
        // Postfix expressions need to cache original value in temp
        // local ____tmp = ${left};
        // ${left} = ____tmp ${replacementOperator} ${right};
        // return ____tmp
        const tmpIdentifier = context.createTempNameForLuaExpression(left);
        const tmpDeclaration = lua.createVariableDeclarationStatement(tmpIdentifier, left);
        const { precedingStatements, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, tmpIdentifier, right, rightPrecedingStatements, operator, expression);
        const assignStatements = (0, assignments_1.transformAssignmentWithRightPrecedingStatements)(context, lhs, operatorExpression, rightPrecedingStatements);
        return {
            precedingStatements: [tmpDeclaration, ...precedingStatements, ...assignStatements],
            result: tmpIdentifier,
        };
    }
    else {
        if (rightPrecedingStatements.length > 0 && isSetterSkippingCompoundAssignmentOperator(operator)) {
            return {
                precedingStatements: transformSetterSkippingCompoundAssignment(left, operator, right, rightPrecedingStatements),
                result: left,
            };
        }
        // Simple expressions
        // ${left} = ${left} ${operator} ${right}
        const { precedingStatements, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, left, right, rightPrecedingStatements, operator, expression);
        const statements = (0, assignments_1.transformAssignmentWithRightPrecedingStatements)(context, lhs, operatorExpression, precedingStatements);
        return { precedingStatements: statements, result: left };
    }
}
function transformCompoundAssignmentExpression(context, expression, 
// TODO: Change type to ts.LeftHandSideExpression?
lhs, rhs, operator, isPostfix) {
    const { precedingStatements, result } = transformCompoundAssignment(context, expression, lhs, rhs, operator, isPostfix);
    context.addPrecedingStatements(precedingStatements);
    return result;
}
exports.transformCompoundAssignmentExpression = transformCompoundAssignmentExpression;
function transformCompoundAssignmentStatement(context, node, lhs, rhs, operator) {
    if ((0, destructuring_assignments_1.isArrayLength)(context, lhs)) {
        const { precedingStatements, result: lengthSetterStatement } = transformCompoundLengthSetter(context, node, lhs, rhs, operator);
        return [...precedingStatements, lengthSetterStatement];
    }
    const left = context.transformExpression(lhs);
    if (!lua.isAssignmentLeftHandSideExpression(left)) {
        context.diagnostics.push((0, diagnostics_1.cannotAssignToNodeOfKind)(node, left.kind));
        return [];
    }
    const { precedingStatements: rightPrecedingStatements, result: right } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(rhs));
    if (lua.isTableIndexExpression(left) && shouldCacheTableIndexExpressions(left, rightPrecedingStatements)) {
        // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
        // local __obj, __index = ${objExpression}, ${indexExpression};
        // ____obj[____index] = ____obj[____index] ${replacementOperator} ${right};
        const obj = context.createTempNameForLuaExpression(left.table);
        const index = context.createTempNameForLuaExpression(left.index);
        const objAndIndexDeclaration = lua.createVariableDeclarationStatement([obj, index], [left.table, left.index]);
        const accessExpression = lua.createTableIndexExpression(obj, index);
        if (isSetterSkippingCompoundAssignmentOperator(operator)) {
            return [
                objAndIndexDeclaration,
                ...transformSetterSkippingCompoundAssignment(accessExpression, operator, right, rightPrecedingStatements, node),
            ];
        }
        const { precedingStatements: rightPrecedingStatements2, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, accessExpression, right, rightPrecedingStatements, operator, node);
        const assignStatement = lua.createAssignmentStatement(accessExpression, operatorExpression);
        return [objAndIndexDeclaration, ...rightPrecedingStatements2, assignStatement];
    }
    else {
        if (isSetterSkippingCompoundAssignmentOperator(operator)) {
            return transformSetterSkippingCompoundAssignment(left, operator, right, rightPrecedingStatements, node);
        }
        // Simple statements
        // ${left} = ${left} ${replacementOperator} ${right}
        const { precedingStatements: rightPrecedingStatements2, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, left, right, rightPrecedingStatements, operator, node);
        return (0, assignments_1.transformAssignmentWithRightPrecedingStatements)(context, lhs, operatorExpression, rightPrecedingStatements2);
    }
}
exports.transformCompoundAssignmentStatement = transformCompoundAssignmentStatement;
function isSetterSkippingCompoundAssignmentOperator(operator) {
    return (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken);
}
function transformSetterSkippingCompoundAssignment(lhs, operator, right, rightPrecedingStatements, node) {
    // These assignments have the form 'if x then y = z', figure out what condition x is first.
    let condition;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
        condition = lhs;
    }
    else if (operator === ts.SyntaxKind.BarBarToken) {
        condition = lua.createUnaryExpression(lhs, lua.SyntaxKind.NotOperator);
    }
    else if (operator === ts.SyntaxKind.QuestionQuestionToken) {
        condition = lua.createBinaryExpression(lhs, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator);
    }
    else {
        (0, utils_1.assertNever)(operator);
    }
    // if condition then lhs = rhs end
    return [
        lua.createIfStatement(condition, lua.createBlock([...rightPrecedingStatements, lua.createAssignmentStatement(lhs, right, node)]), undefined, node),
    ];
}
function transformCompoundLengthSetter(context, node, lhs, rhs, operator) {
    const { precedingStatements: rightPrecedingStatements, result: right } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(rhs));
    const table = context.transformExpression(lhs.expression);
    const lengthExpression = lua.createUnaryExpression(table, lua.SyntaxKind.LengthOperator, lhs);
    const { precedingStatements, result: operatorExpression } = (0, index_1.transformBinaryOperation)(context, lengthExpression, right, rightPrecedingStatements, operator, node);
    const arrayLengthAssignment = lua.createExpressionStatement((0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ArraySetLength, node, table, operatorExpression));
    return { precedingStatements, result: arrayLengthAssignment };
}
//# sourceMappingURL=compound.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformAssignmentPattern = exports.transformDestructuringAssignment = exports.isArrayLength = void 0;
const ts = require("typescript");
const _1 = require(".");
const lua = require("../../../LuaAST");
const utils_1 = require("../../../utils");
const lualib_1 = require("../../utils/lualib");
const preceding_statements_1 = require("../../utils/preceding-statements");
const typescript_1 = require("../../utils/typescript");
const expression_list_1 = require("../expression-list");
const literal_1 = require("../literal");
const assignments_1 = require("./assignments");
function isArrayLength(context, expression) {
    if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) {
        return false;
    }
    const type = context.checker.getTypeAtLocation(expression.expression);
    if (!(0, typescript_1.isArrayType)(context, type)) {
        return false;
    }
    const name = ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ts.isStringLiteral(expression.argumentExpression)
            ? expression.argumentExpression.text
            : undefined;
    return name === "length";
}
exports.isArrayLength = isArrayLength;
function transformDestructuringAssignment(context, node, root, rightHasPrecedingStatements) {
    return transformAssignmentPattern(context, node.left, root, rightHasPrecedingStatements);
}
exports.transformDestructuringAssignment = transformDestructuringAssignment;
function transformAssignmentPattern(context, node, root, rightHasPrecedingStatements) {
    switch (node.kind) {
        case ts.SyntaxKind.ObjectLiteralExpression:
            return transformObjectLiteralAssignmentPattern(context, node, root, rightHasPrecedingStatements);
        case ts.SyntaxKind.ArrayLiteralExpression:
            return transformArrayLiteralAssignmentPattern(context, node, root, rightHasPrecedingStatements);
    }
}
exports.transformAssignmentPattern = transformAssignmentPattern;
function transformArrayLiteralAssignmentPattern(context, node, root, rightHasPrecedingStatements) {
    return node.elements.flatMap((element, index) => {
        const indexedRoot = lua.createTableIndexExpression(root, lua.createNumericLiteral(index + 1), element);
        switch (element.kind) {
            case ts.SyntaxKind.ObjectLiteralExpression:
                return transformObjectLiteralAssignmentPattern(context, element, indexedRoot, rightHasPrecedingStatements);
            case ts.SyntaxKind.ArrayLiteralExpression:
                return transformArrayLiteralAssignmentPattern(context, element, indexedRoot, rightHasPrecedingStatements);
            case ts.SyntaxKind.BinaryExpression:
                const assignedVariable = context.createTempNameForLuaExpression(indexedRoot);
                const assignedVariableDeclaration = lua.createVariableDeclarationStatement(assignedVariable, indexedRoot);
                const nilCondition = lua.createBinaryExpression(assignedVariable, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator);
                const { precedingStatements: defaultPrecedingStatements, result: defaultAssignmentStatements } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, assignments_1.transformAssignment)(context, element.left, context.transformExpression(element.right)));
                // Keep preceding statements inside if block
                defaultAssignmentStatements.unshift(...defaultPrecedingStatements);
                const elseAssignmentStatements = (0, assignments_1.transformAssignment)(context, element.left, assignedVariable);
                const ifBlock = lua.createBlock(defaultAssignmentStatements);
                const elseBlock = lua.createBlock(elseAssignmentStatements);
                const ifStatement = lua.createIfStatement(nilCondition, ifBlock, elseBlock, node);
                return [assignedVariableDeclaration, ifStatement];
            case ts.SyntaxKind.Identifier:
            case ts.SyntaxKind.PropertyAccessExpression:
            case ts.SyntaxKind.ElementAccessExpression:
                const { precedingStatements, result: statements } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, assignments_1.transformAssignment)(context, element, indexedRoot, rightHasPrecedingStatements));
                return [...precedingStatements, ...statements]; // Keep preceding statements in order
            case ts.SyntaxKind.SpreadElement:
                if (index !== node.elements.length - 1) {
                    // TypeScript error
                    return [];
                }
                const restElements = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ArraySlice, undefined, root, lua.createNumericLiteral(index));
                const { precedingStatements: spreadPrecedingStatements, result: spreadStatements } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, assignments_1.transformAssignment)(context, element.expression, restElements, rightHasPrecedingStatements));
                return [...spreadPrecedingStatements, ...spreadStatements]; // Keep preceding statements in order
            case ts.SyntaxKind.OmittedExpression:
                return [];
            default:
                // TypeScript error
                return [];
        }
    });
}
function transformObjectLiteralAssignmentPattern(context, node, root, rightHasPrecedingStatements) {
    const result = [];
    for (const property of node.properties) {
        switch (property.kind) {
            case ts.SyntaxKind.ShorthandPropertyAssignment:
                result.push(...transformShorthandPropertyAssignment(context, property, root));
                break;
            case ts.SyntaxKind.PropertyAssignment:
                result.push(...transformPropertyAssignment(context, property, root, rightHasPrecedingStatements));
                break;
            case ts.SyntaxKind.SpreadAssignment:
                result.push(...transformSpreadAssignment(context, property, root, node.properties));
                break;
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
                // TypeScript error
                break;
            default:
                (0, utils_1.assertNever)(property);
        }
    }
    return result;
}
function transformShorthandPropertyAssignment(context, node, root) {
    const result = [];
    const assignmentVariableName = (0, assignments_1.transformAssignmentLeftHandSideExpression)(context, node.name);
    const extractionIndex = lua.createStringLiteral(node.name.text);
    const variableExtractionAssignmentStatements = (0, assignments_1.transformAssignment)(context, node.name, lua.createTableIndexExpression(root, extractionIndex));
    result.push(...variableExtractionAssignmentStatements);
    const defaultInitializer = node.objectAssignmentInitializer
        ? context.transformExpression(node.objectAssignmentInitializer)
        : undefined;
    if (defaultInitializer) {
        const nilCondition = lua.createBinaryExpression(assignmentVariableName, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator);
        const assignmentStatements = (0, assignments_1.transformAssignment)(context, node.name, defaultInitializer);
        const ifBlock = lua.createBlock(assignmentStatements);
        result.push(lua.createIfStatement(nilCondition, ifBlock, undefined, node));
    }
    return result;
}
function transformPropertyAssignment(context, node, root, rightHasPrecedingStatements) {
    const result = [];
    if ((0, typescript_1.isAssignmentPattern)(node.initializer)) {
        const propertyAccessString = (0, literal_1.transformPropertyName)(context, node.name);
        const newRootAccess = lua.createTableIndexExpression(root, propertyAccessString);
        if (ts.isObjectLiteralExpression(node.initializer)) {
            return transformObjectLiteralAssignmentPattern(context, node.initializer, newRootAccess, rightHasPrecedingStatements);
        }
        if (ts.isArrayLiteralExpression(node.initializer)) {
            return transformArrayLiteralAssignmentPattern(context, node.initializer, newRootAccess, rightHasPrecedingStatements);
        }
    }
    context.pushPrecedingStatements();
    let variableToExtract = (0, literal_1.transformPropertyName)(context, node.name);
    // Must be evaluated before left's preceding statements
    variableToExtract = (0, expression_list_1.moveToPrecedingTemp)(context, variableToExtract, node.name);
    const extractingExpression = lua.createTableIndexExpression(root, variableToExtract);
    let destructureAssignmentStatements;
    if (ts.isBinaryExpression(node.initializer)) {
        if (ts.isPropertyAccessExpression(node.initializer.left) ||
            ts.isElementAccessExpression(node.initializer.left)) {
            // Access expressions need their table and index expressions cached to preserve execution order
            const left = (0, utils_1.cast)(context.transformExpression(node.initializer.left), lua.isTableIndexExpression);
            const rightExpression = node.initializer.right;
            const { precedingStatements: defaultPrecedingStatements, result: defaultExpression } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(rightExpression));
            const tableTemp = context.createTempNameForLuaExpression(left.table);
            const indexTemp = context.createTempNameForLuaExpression(left.index);
            const tempsDeclaration = lua.createVariableDeclarationStatement([tableTemp, indexTemp], [left.table, left.index]);
            // obj[index] = extractingExpression ?? defaultExpression
            const { precedingStatements: rightPrecedingStatements, result: rhs } = (0, _1.transformBinaryOperation)(context, extractingExpression, defaultExpression, defaultPrecedingStatements, ts.SyntaxKind.QuestionQuestionToken, node.initializer);
            const assignStatement = lua.createAssignmentStatement(lua.createTableIndexExpression(tableTemp, indexTemp), rhs);
            destructureAssignmentStatements = [tempsDeclaration, ...rightPrecedingStatements, assignStatement];
        }
        else {
            const assignmentLeftHandSide = context.transformExpression(node.initializer.left);
            const nilCondition = lua.createBinaryExpression(assignmentLeftHandSide, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator);
            const ifBlock = lua.createBlock((0, assignments_1.transformAssignmentStatement)(context, node.initializer));
            destructureAssignmentStatements = [lua.createIfStatement(nilCondition, ifBlock, undefined, node)];
        }
    }
    else {
        destructureAssignmentStatements = (0, assignments_1.transformAssignment)(context, node.initializer, extractingExpression, rightHasPrecedingStatements);
    }
    result.push(...context.popPrecedingStatements());
    result.push(...destructureAssignmentStatements);
    return result;
}
function transformSpreadAssignment(context, node, root, properties) {
    const usedProperties = [];
    for (const property of properties) {
        if ((ts.isShorthandPropertyAssignment(property) || ts.isPropertyAssignment(property)) &&
            !ts.isComputedPropertyName(property.name) &&
            !ts.isPrivateIdentifier(property.name)) {
            const name = ts.isIdentifier(property.name)
                ? lua.createStringLiteral(property.name.text)
                : context.transformExpression(property.name);
            usedProperties.push(lua.createTableFieldExpression(lua.createBooleanLiteral(true), name));
        }
    }
    const extractingExpression = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ObjectRest, undefined, root, lua.createTableExpression(usedProperties));
    return (0, assignments_1.transformAssignment)(context, node.expression, extractingExpression);
}
//# sourceMappingURL=destructuring-assignments.js.map
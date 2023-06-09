"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformAssignmentStatement = exports.transformAssignmentExpression = exports.transformAssignmentWithRightPrecedingStatements = exports.transformAssignment = exports.transformAssignmentLeftHandSideExpression = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const assignment_validation_1 = require("../../utils/assignment-validation");
const export_1 = require("../../utils/export");
const lua_ast_1 = require("../../utils/lua-ast");
const lualib_1 = require("../../utils/lualib");
const typescript_1 = require("../../utils/typescript");
const destructuring_assignments_1 = require("./destructuring-assignments");
const multi_1 = require("../language-extensions/multi");
const diagnostics_1 = require("../../utils/diagnostics");
const access_1 = require("../access");
const expression_list_1 = require("../expression-list");
const preceding_statements_1 = require("../../utils/preceding-statements");
function transformAssignmentLeftHandSideExpression(context, node, rightHasPrecedingStatements) {
    // Access expressions need the components of the left side cached in temps before the right side's preceding statements
    if (rightHasPrecedingStatements && (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node))) {
        let table = context.transformExpression(node.expression);
        table = (0, expression_list_1.moveToPrecedingTemp)(context, table, node.expression);
        let index;
        if (ts.isElementAccessExpression(node)) {
            index = (0, access_1.transformElementAccessArgument)(context, node);
            index = (0, expression_list_1.moveToPrecedingTemp)(context, index, node.argumentExpression);
        }
        else {
            index = lua.createStringLiteral(node.name.text, node.name);
        }
        return lua.createTableIndexExpression(table, index, node);
    }
    const symbol = context.checker.getSymbolAtLocation(node);
    const left = context.transformExpression(node);
    if (lua.isIdentifier(left) && symbol && (0, export_1.isSymbolExported)(context, symbol)) {
        return (0, export_1.createExportedIdentifier)(context, left);
    }
    if (lua.isAssignmentLeftHandSideExpression(left)) {
        return left;
    }
    else {
        context.diagnostics.push((0, diagnostics_1.cannotAssignToNodeOfKind)(node, left.kind));
        return lua.createAnonymousIdentifier();
    }
}
exports.transformAssignmentLeftHandSideExpression = transformAssignmentLeftHandSideExpression;
function transformAssignment(context, 
// TODO: Change type to ts.LeftHandSideExpression?
lhs, right, rightHasPrecedingStatements, parent) {
    if (ts.isOptionalChain(lhs)) {
        context.diagnostics.push((0, diagnostics_1.notAllowedOptionalAssignment)(lhs));
        return [];
    }
    if ((0, destructuring_assignments_1.isArrayLength)(context, lhs)) {
        const arrayLengthAssignment = lua.createExpressionStatement((0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ArraySetLength, parent, context.transformExpression(lhs.expression), right));
        return [arrayLengthAssignment];
    }
    const symbol = lhs.parent && ts.isShorthandPropertyAssignment(lhs.parent)
        ? context.checker.getShorthandAssignmentValueSymbol(lhs.parent)
        : context.checker.getSymbolAtLocation(lhs);
    const dependentSymbols = symbol ? (0, export_1.getDependenciesOfSymbol)(context, symbol) : [];
    const left = transformAssignmentLeftHandSideExpression(context, lhs, rightHasPrecedingStatements);
    const rootAssignment = lua.createAssignmentStatement(left, right, lhs.parent);
    return [
        rootAssignment,
        ...dependentSymbols.map(symbol => {
            const [left] = rootAssignment.left;
            const identifierToAssign = (0, export_1.createExportedIdentifier)(context, lua.createIdentifier(symbol.name));
            return lua.createAssignmentStatement(identifierToAssign, left);
        }),
    ];
}
exports.transformAssignment = transformAssignment;
function transformAssignmentWithRightPrecedingStatements(context, lhs, right, rightPrecedingStatements, parent) {
    return [
        ...rightPrecedingStatements,
        ...transformAssignment(context, lhs, right, rightPrecedingStatements.length > 0, parent),
    ];
}
exports.transformAssignmentWithRightPrecedingStatements = transformAssignmentWithRightPrecedingStatements;
function transformDestructuredAssignmentExpression(context, expression) {
    let { precedingStatements: rightPrecedingStatements, result: right } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(expression.right));
    context.addPrecedingStatements(rightPrecedingStatements);
    if ((0, multi_1.isMultiReturnCall)(context, expression.right)) {
        right = (0, lua_ast_1.wrapInTable)(right);
    }
    const rightExpr = (0, expression_list_1.moveToPrecedingTemp)(context, right, expression.right);
    const statements = (0, destructuring_assignments_1.transformDestructuringAssignment)(context, expression, rightExpr, rightPrecedingStatements.length > 0);
    return { statements, result: rightExpr };
}
function transformAssignmentExpression(context, expression) {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    (0, assignment_validation_1.validateAssignment)(context, expression.right, rightType, leftType);
    if ((0, destructuring_assignments_1.isArrayLength)(context, expression.left)) {
        // array.length = x
        return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ArraySetLength, expression, context.transformExpression(expression.left.expression), context.transformExpression(expression.right));
    }
    if ((0, typescript_1.isDestructuringAssignment)(expression)) {
        const { statements, result } = transformDestructuredAssignmentExpression(context, expression);
        context.addPrecedingStatements(statements);
        return result;
    }
    if (ts.isPropertyAccessExpression(expression.left) || ts.isElementAccessExpression(expression.left)) {
        const { precedingStatements, result: right } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(expression.right));
        const left = transformAssignmentLeftHandSideExpression(context, expression.left, precedingStatements.length > 0);
        context.addPrecedingStatements(precedingStatements);
        const rightExpr = (0, expression_list_1.moveToPrecedingTemp)(context, right, expression.right);
        context.addPrecedingStatements(lua.createAssignmentStatement(left, rightExpr, expression.left));
        return rightExpr;
    }
    else {
        // Simple assignment
        // ${left} = ${right}; return ${left}
        const left = context.transformExpression(expression.left);
        const right = context.transformExpression(expression.right);
        context.addPrecedingStatements(transformAssignment(context, expression.left, right));
        return left;
    }
}
exports.transformAssignmentExpression = transformAssignmentExpression;
const canBeTransformedToLuaAssignmentStatement = (context, node) => ts.isArrayLiteralExpression(node.left) &&
    node.left.elements.every(element => {
        if ((0, destructuring_assignments_1.isArrayLength)(context, element)) {
            return false;
        }
        if (ts.isPropertyAccessExpression(element) || ts.isElementAccessExpression(element)) {
            // Lua's execution order for multi-assignments is not the same as JS's, so we should always
            // break these down when the left side may have side effects.
            return false;
        }
        if (ts.isIdentifier(element)) {
            const symbol = context.checker.getSymbolAtLocation(element);
            if (symbol) {
                const aliases = (0, export_1.getDependenciesOfSymbol)(context, symbol);
                return aliases.length === 0;
            }
        }
    });
function transformAssignmentStatement(context, expression) {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    (0, assignment_validation_1.validateAssignment)(context, expression.right, rightType, leftType);
    if ((0, typescript_1.isDestructuringAssignment)(expression)) {
        if (canBeTransformedToLuaAssignmentStatement(context, expression)) {
            const rightType = context.checker.getTypeAtLocation(expression.right);
            let right;
            if (ts.isArrayLiteralExpression(expression.right)) {
                right = (0, expression_list_1.transformExpressionList)(context, expression.right.elements);
            }
            else {
                right = context.transformExpression(expression.right);
                if (!(0, multi_1.isMultiReturnCall)(context, expression.right) && (0, typescript_1.isArrayType)(context, rightType)) {
                    right = (0, lua_ast_1.createUnpackCall)(context, right, expression.right);
                }
            }
            const left = expression.left.elements.map(e => transformAssignmentLeftHandSideExpression(context, e));
            return [lua.createAssignmentStatement(left, right, expression)];
        }
        const { statements } = transformDestructuredAssignmentExpression(context, expression);
        return statements;
    }
    else {
        const { precedingStatements, result: right } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(expression.right));
        return transformAssignmentWithRightPrecedingStatements(context, expression.left, right, precedingStatements);
    }
}
exports.transformAssignmentStatement = transformAssignmentStatement;
//# sourceMappingURL=assignments.js.map
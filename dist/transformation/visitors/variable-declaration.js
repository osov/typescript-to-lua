"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformVariableStatement = exports.checkVariableDeclarationList = exports.transformVariableDeclaration = exports.transformBindingVariableDeclaration = exports.transformBindingPattern = exports.transformArrayBindingElement = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const utils_1 = require("../../utils");
const assignment_validation_1 = require("../utils/assignment-validation");
const diagnostics_1 = require("../utils/diagnostics");
const export_1 = require("../utils/export");
const lua_ast_1 = require("../utils/lua-ast");
const lualib_1 = require("../utils/lualib");
const preceding_statements_1 = require("../utils/preceding-statements");
const function_1 = require("./function");
const identifier_1 = require("./identifier");
const multi_1 = require("./language-extensions/multi");
const literal_1 = require("./literal");
const expression_list_1 = require("./expression-list");
function transformArrayBindingElement(context, name) {
    if (ts.isOmittedExpression(name)) {
        return lua.createAnonymousIdentifier(name);
    }
    else if (ts.isIdentifier(name)) {
        return (0, identifier_1.transformIdentifier)(context, name);
    }
    else if (ts.isBindingElement(name)) {
        if (ts.isIdentifier(name.name)) {
            return (0, identifier_1.transformIdentifier)(context, name.name);
        }
        else {
            // ts.isBindingPattern(name.name)
            const tempName = context.createTempNameForNode(name.name);
            context.addPrecedingStatements(transformBindingPattern(context, name.name, tempName));
            return tempName;
        }
    }
    else {
        (0, utils_1.assertNever)(name);
    }
}
exports.transformArrayBindingElement = transformArrayBindingElement;
function transformBindingPattern(context, pattern, table, propertyAccessStack = []) {
    var _a;
    const result = [];
    for (const [index, element] of pattern.elements.entries()) {
        if (ts.isOmittedExpression(element))
            continue;
        if (ts.isArrayBindingPattern(element.name) || ts.isObjectBindingPattern(element.name)) {
            // nested binding pattern
            const propertyName = ts.isObjectBindingPattern(pattern)
                ? element.propertyName
                : ts.factory.createNumericLiteral(String(index + 1));
            if (propertyName !== undefined) {
                propertyAccessStack.push(propertyName);
            }
            result.push(...transformBindingPattern(context, element.name, table, propertyAccessStack));
            continue;
        }
        // Build the path to the table
        const tableExpression = propertyAccessStack.reduce((path, property) => lua.createTableIndexExpression(path, (0, literal_1.transformPropertyName)(context, property)), table);
        // The identifier of the new variable
        const variableName = (0, identifier_1.transformIdentifier)(context, element.name);
        // The field to extract
        const elementName = (_a = element.propertyName) !== null && _a !== void 0 ? _a : element.name;
        const { precedingStatements, result: propertyName } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, literal_1.transformPropertyName)(context, elementName));
        result.push(...precedingStatements); // Keep property's preceding statements in order
        let expression;
        if (element.dotDotDotToken) {
            if (index !== pattern.elements.length - 1) {
                // TypeScript error
                continue;
            }
            if (ts.isObjectBindingPattern(pattern)) {
                const excludedProperties = [];
                for (const element of pattern.elements) {
                    // const { ...x } = ...;
                    //         ~~~~
                    if (element.dotDotDotToken)
                        continue;
                    // const { x } = ...;
                    //         ~
                    if (ts.isIdentifier(element.name) && !element.propertyName) {
                        excludedProperties.push(element.name);
                    }
                    // const { x: ... } = ...;
                    //         ~~~~~~
                    if (element.propertyName && element.name && ts.isIdentifier(element.propertyName)) {
                        excludedProperties.push(element.propertyName);
                    }
                }
                const excludedPropertiesTable = excludedProperties.map(e => lua.createTableFieldExpression(lua.createBooleanLiteral(true), lua.createStringLiteral(e.text, e)));
                expression = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ObjectRest, undefined, tableExpression, lua.createTableExpression(excludedPropertiesTable));
            }
            else {
                expression = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.ArraySlice, undefined, tableExpression, lua.createNumericLiteral(index));
            }
        }
        else {
            expression = lua.createTableIndexExpression(tableExpression, ts.isObjectBindingPattern(pattern) ? propertyName : lua.createNumericLiteral(index + 1));
        }
        result.push(...(0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, variableName, expression));
        if (element.initializer) {
            const identifier = (0, export_1.addExportToIdentifier)(context, variableName);
            const tsInitializer = element.initializer;
            const { precedingStatements: initializerPrecedingStatements, result: initializer } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(tsInitializer));
            result.push(lua.createIfStatement(lua.createBinaryExpression(identifier, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator), lua.createBlock([
                ...initializerPrecedingStatements,
                lua.createAssignmentStatement(identifier, initializer),
            ])));
        }
    }
    propertyAccessStack.pop();
    return result;
}
exports.transformBindingPattern = transformBindingPattern;
function transformBindingVariableDeclaration(context, bindingPattern, initializer) {
    const statements = [];
    // For object, nested or rest bindings fall back to transformBindingPattern
    const isComplexBindingElement = (e) => ts.isBindingElement(e) && (!ts.isIdentifier(e.name) || e.dotDotDotToken);
    if (ts.isObjectBindingPattern(bindingPattern) || bindingPattern.elements.some(isComplexBindingElement)) {
        let table;
        if (initializer) {
            // Contain the expression in a temporary variable
            let expression = context.transformExpression(initializer);
            if ((0, multi_1.isMultiReturnCall)(context, initializer)) {
                expression = (0, lua_ast_1.wrapInTable)(expression);
            }
            const { precedingStatements: moveStatements, result: movedExpr } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, expression_list_1.moveToPrecedingTemp)(context, expression, initializer));
            statements.push(...moveStatements);
            table = movedExpr;
        }
        else {
            table = lua.createAnonymousIdentifier();
        }
        statements.push(...transformBindingPattern(context, bindingPattern, table));
        return statements;
    }
    const vars = bindingPattern.elements.length > 0
        ? bindingPattern.elements.map(e => transformArrayBindingElement(context, e))
        : lua.createAnonymousIdentifier();
    if (initializer) {
        if ((0, multi_1.isMultiReturnCall)(context, initializer)) {
            // Don't unpack LuaMultiReturn functions
            statements.push(...(0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, vars, context.transformExpression(initializer), initializer));
        }
        else if (ts.isArrayLiteralExpression(initializer)) {
            // Don't unpack array literals
            const values = initializer.elements.length > 0
                ? initializer.elements.map(e => context.transformExpression(e))
                : lua.createNilLiteral();
            statements.push(...(0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, vars, values, initializer));
        }
        else {
            // local vars = this.transpileDestructingAssignmentValue(node.initializer);
            const unpackedInitializer = (0, lua_ast_1.createUnpackCall)(context, context.transformExpression(initializer), initializer);
            statements.push(...(0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, vars, unpackedInitializer, initializer));
        }
    }
    else {
        statements.push(...(0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, vars, lua.createNilLiteral(), initializer));
    }
    for (const element of bindingPattern.elements) {
        if (!ts.isOmittedExpression(element) && element.initializer) {
            const variableName = (0, identifier_1.transformIdentifier)(context, element.name);
            const identifier = (0, export_1.addExportToIdentifier)(context, variableName);
            statements.push(lua.createIfStatement(lua.createBinaryExpression(identifier, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator), lua.createBlock([
                lua.createAssignmentStatement(identifier, context.transformExpression(element.initializer)),
            ])));
        }
    }
    return statements;
}
exports.transformBindingVariableDeclaration = transformBindingVariableDeclaration;
// TODO: FunctionVisitor<ts.VariableDeclaration>
function transformVariableDeclaration(context, statement) {
    if (statement.initializer && statement.type) {
        const initializerType = context.checker.getTypeAtLocation(statement.initializer);
        const varType = context.checker.getTypeFromTypeNode(statement.type);
        (0, assignment_validation_1.validateAssignment)(context, statement.initializer, initializerType, varType);
    }
    if (ts.isIdentifier(statement.name)) {
        // Find variable identifier
        const identifierName = (0, identifier_1.transformIdentifier)(context, statement.name);
        const value = statement.initializer && context.transformExpression(statement.initializer);
        // Wrap functions being assigned to a type that contains additional properties in a callable table
        // This catches 'const foo = function() {}; foo.bar = "FOOBAR";'
        const wrappedValue = value && shouldWrapInitializerInCallableTable() ? (0, function_1.createCallableTable)(value) : value;
        return (0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, identifierName, wrappedValue, statement);
    }
    else if (ts.isArrayBindingPattern(statement.name) || ts.isObjectBindingPattern(statement.name)) {
        return transformBindingVariableDeclaration(context, statement.name, statement.initializer);
    }
    else {
        return (0, utils_1.assertNever)(statement.name);
    }
    function shouldWrapInitializerInCallableTable() {
        (0, utils_1.assert)(statement.initializer);
        const initializer = ts.skipOuterExpressions(statement.initializer);
        // do not wrap if not a function expression
        if (!ts.isFunctionExpression(initializer) && !ts.isArrowFunction(initializer))
            return false;
        // Skip named function expressions because they will have been wrapped already
        if (ts.isFunctionExpression(initializer) && initializer.name)
            return false;
        return (0, function_1.isFunctionTypeWithProperties)(context, context.checker.getTypeAtLocation(statement.name));
    }
}
exports.transformVariableDeclaration = transformVariableDeclaration;
function checkVariableDeclarationList(context, node) {
    if ((node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) === 0) {
        const token = node.getFirstToken();
        (0, utils_1.assert)(token);
        context.diagnostics.push((0, diagnostics_1.unsupportedVarDeclaration)(token));
    }
}
exports.checkVariableDeclarationList = checkVariableDeclarationList;
const transformVariableStatement = (node, context) => {
    checkVariableDeclarationList(context, node.declarationList);
    return node.declarationList.declarations.flatMap(declaration => transformVariableDeclaration(context, declaration));
};
exports.transformVariableStatement = transformVariableStatement;
//# sourceMappingURL=variable-declaration.js.map
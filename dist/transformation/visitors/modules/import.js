"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformImportExpression = exports.transformImportEqualsDeclaration = exports.transformExternalModuleReference = exports.transformImportDeclaration = exports.createModuleRequire = void 0;
const path = require("path");
const ts = require("typescript");
const lua = require("../../../LuaAST");
const promise_1 = require("../../builtins/promise");
const annotations_1 = require("../../utils/annotations");
const export_1 = require("../../utils/export");
const lua_ast_1 = require("../../utils/lua-ast");
const lualib_1 = require("../../utils/lualib");
const safe_names_1 = require("../../utils/safe-names");
const scope_1 = require("../../utils/scope");
const identifier_1 = require("../identifier");
const literal_1 = require("../literal");
function isNoResolutionPath(context, moduleSpecifier) {
    const moduleOwnerSymbol = context.checker.getSymbolAtLocation(moduleSpecifier);
    if (!moduleOwnerSymbol)
        return false;
    const annotations = (0, annotations_1.getSymbolAnnotations)(moduleOwnerSymbol);
    return annotations.has(annotations_1.AnnotationKind.NoResolution);
}
function createModuleRequire(context, moduleSpecifier, tsOriginal = moduleSpecifier) {
    const params = [];
    if (ts.isStringLiteral(moduleSpecifier)) {
        const modulePath = isNoResolutionPath(context, moduleSpecifier)
            ? `@NoResolution:${moduleSpecifier.text}`
            : moduleSpecifier.text;
        params.push(lua.createStringLiteral(modulePath));
    }
    return lua.createCallExpression(lua.createIdentifier("require"), params, tsOriginal);
}
exports.createModuleRequire = createModuleRequire;
function shouldBeImported(context, importNode) {
    return context.resolver.isReferencedAliasDeclaration(importNode);
}
function transformImportSpecifier(context, importSpecifier, moduleTableName) {
    const leftIdentifier = (0, identifier_1.transformIdentifier)(context, importSpecifier.name);
    const propertyName = (0, literal_1.transformPropertyName)(context, importSpecifier.propertyName ? importSpecifier.propertyName : importSpecifier.name);
    return lua.createVariableDeclarationStatement(leftIdentifier, lua.createTableIndexExpression(moduleTableName, propertyName), importSpecifier);
}
const transformImportDeclaration = (statement, context) => {
    const scope = (0, scope_1.peekScope)(context);
    if (!scope.importStatements) {
        scope.importStatements = [];
    }
    const result = [];
    const requireCall = createModuleRequire(context, statement.moduleSpecifier);
    // import "./module";
    // require("module")
    if (statement.importClause === undefined) {
        result.push(lua.createExpressionStatement(requireCall));
        scope.importStatements.push(...result);
        return undefined;
    }
    const importPath = ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text.replace(/"/g, "")
        : "module";
    // Create the require statement to extract values.
    // local ____module = require("module")
    const importUniqueName = lua.createIdentifier((0, safe_names_1.createSafeName)(path.basename(importPath)));
    let usingRequireStatement = false;
    // import defaultValue from "./module";
    // local defaultValue = __module.default
    if (statement.importClause.name) {
        if (shouldBeImported(context, statement.importClause)) {
            const propertyName = (0, export_1.createDefaultExportStringLiteral)(statement.importClause.name);
            const defaultImportAssignmentStatement = lua.createVariableDeclarationStatement((0, identifier_1.transformIdentifier)(context, statement.importClause.name), lua.createTableIndexExpression(importUniqueName, propertyName), statement.importClause.name);
            result.push(defaultImportAssignmentStatement);
            usingRequireStatement = true;
        }
    }
    // import * as module from "./module";
    // local module = require("module")
    if (statement.importClause.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings)) {
        if (context.resolver.isReferencedAliasDeclaration(statement.importClause.namedBindings)) {
            const requireStatement = lua.createVariableDeclarationStatement((0, identifier_1.transformIdentifier)(context, statement.importClause.namedBindings.name), requireCall, statement);
            result.push(requireStatement);
        }
    }
    // import { a, b, c } from "./module";
    // local a = __module.a
    // local b = __module.b
    // local c = __module.c
    if (statement.importClause.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
        const assignmentStatements = statement.importClause.namedBindings.elements
            .filter(importSpecifier => shouldBeImported(context, importSpecifier))
            .map(importSpecifier => transformImportSpecifier(context, importSpecifier, importUniqueName));
        if (assignmentStatements.length > 0) {
            usingRequireStatement = true;
        }
        result.push(...assignmentStatements);
    }
    if (result.length === 0) {
        return undefined;
    }
    if (usingRequireStatement) {
        result.unshift(lua.createVariableDeclarationStatement(importUniqueName, requireCall, statement));
    }
    scope.importStatements.push(...result);
    return undefined;
};
exports.transformImportDeclaration = transformImportDeclaration;
const transformExternalModuleReference = (node, context) => createModuleRequire(context, node.expression, node);
exports.transformExternalModuleReference = transformExternalModuleReference;
const transformImportEqualsDeclaration = (node, context) => {
    if (!context.resolver.isReferencedAliasDeclaration(node) &&
        (ts.isExternalModuleReference(node.moduleReference) ||
            ts.isExternalModule(context.sourceFile) ||
            !context.resolver.isTopLevelValueImportEqualsWithEntityName(node))) {
        return undefined;
    }
    const name = (0, identifier_1.transformIdentifier)(context, node.name);
    const expression = context.transformExpression(node.moduleReference);
    return (0, lua_ast_1.createHoistableVariableDeclarationStatement)(context, name, expression, node);
};
exports.transformImportEqualsDeclaration = transformImportEqualsDeclaration;
const transformImportExpression = (node, context) => {
    (0, lualib_1.importLuaLibFeature)(context, lualib_1.LuaLibFeature.Promise);
    const moduleRequire = node.arguments.length > 0 ? createModuleRequire(context, node.arguments[0], node) : lua.createNilLiteral();
    return lua.createCallExpression((0, promise_1.createStaticPromiseFunctionAccessor)("resolve", node), [moduleRequire], node);
};
exports.transformImportExpression = transformImportExpression;
//# sourceMappingURL=import.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformExportDeclaration = exports.getExported = exports.transformExportAssignment = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const utils_1 = require("../../../utils");
const export_1 = require("../../utils/export");
const lua_ast_1 = require("../../utils/lua-ast");
const scope_1 = require("../../utils/scope");
const block_1 = require("../block");
const identifier_1 = require("../identifier");
const literal_1 = require("../literal");
const import_1 = require("./import");
const transformExportAssignment = (node, context) => {
    if (!context.resolver.isValueAliasDeclaration(node)) {
        return undefined;
    }
    const exportedValue = context.transformExpression(node.expression);
    // export = [expression];
    // ____exports = [expression];
    if (node.isExportEquals) {
        return lua.createVariableDeclarationStatement((0, lua_ast_1.createExportsIdentifier)(), exportedValue, node);
    }
    else {
        // export default [expression];
        // ____exports.default = [expression];
        return lua.createAssignmentStatement(lua.createTableIndexExpression((0, lua_ast_1.createExportsIdentifier)(), (0, export_1.createDefaultExportStringLiteral)(node)), exportedValue, node);
    }
};
exports.transformExportAssignment = transformExportAssignment;
function transformExportAll(context, node) {
    (0, utils_1.assert)(node.moduleSpecifier);
    if (!context.resolver.moduleExportsSomeValue(node.moduleSpecifier)) {
        return undefined;
    }
    const moduleRequire = (0, import_1.createModuleRequire)(context, node.moduleSpecifier);
    // export * as ns from "...";
    // exports.ns = require(...)
    if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
        const assignToExports = lua.createAssignmentStatement(lua.createTableIndexExpression((0, lua_ast_1.createExportsIdentifier)(), lua.createStringLiteral(node.exportClause.name.text)), moduleRequire);
        return assignToExports;
    }
    // export * from "...";
    // exports all values EXCEPT "default" from "..."
    const result = [];
    // local ____export = require(...)
    const tempModuleIdentifier = lua.createIdentifier("____export");
    const declaration = lua.createVariableDeclarationStatement(tempModuleIdentifier, moduleRequire);
    result.push(declaration);
    // ____exports[____exportKey] = ____exportValue
    const forKey = lua.createIdentifier("____exportKey");
    const forValue = lua.createIdentifier("____exportValue");
    const leftAssignment = lua.createAssignmentStatement(lua.createTableIndexExpression((0, lua_ast_1.createExportsIdentifier)(), forKey), forValue);
    // if key ~= "default" then
    //  -- export the value, do not export "default" values
    // end
    const ifBody = lua.createBlock([leftAssignment]);
    const ifStatement = lua.createIfStatement(lua.createBinaryExpression(lua.cloneIdentifier(forKey), lua.createStringLiteral("default"), lua.SyntaxKind.InequalityOperator), ifBody);
    // for ____exportKey, ____exportValue in ____export do
    //  -- export ____exportValue, unless ____exportKey is "default"
    // end
    const pairsIdentifier = lua.createIdentifier("pairs");
    const forIn = lua.createForInStatement(lua.createBlock([ifStatement]), [lua.cloneIdentifier(forKey), lua.cloneIdentifier(forValue)], [lua.createCallExpression(pairsIdentifier, [lua.cloneIdentifier(tempModuleIdentifier)])]);
    result.push(forIn);
    // Wrap this in a DoStatement to prevent polluting the scope.
    return lua.createDoStatement(result, node);
}
const isDefaultExportSpecifier = (node) => (node.name && node.name.originalKeywordKind === ts.SyntaxKind.DefaultKeyword) ||
    (node.propertyName && node.propertyName.originalKeywordKind === ts.SyntaxKind.DefaultKeyword);
function transformExportSpecifier(context, node) {
    const exportedSymbol = context.checker.getExportSpecifierLocalTargetSymbol(node);
    const exportedIdentifier = node.propertyName ? node.propertyName : node.name;
    const exportedExpression = (0, literal_1.createShorthandIdentifier)(context, exportedSymbol, exportedIdentifier);
    const isDefault = isDefaultExportSpecifier(node);
    const exportAssignmentLeftHandSide = isDefault
        ? (0, export_1.createDefaultExportExpression)(node)
        : (0, export_1.createExportedIdentifier)(context, (0, identifier_1.transformIdentifier)(context, node.name));
    return lua.createAssignmentStatement(exportAssignmentLeftHandSide, exportedExpression, node);
}
function transformExportSpecifiersFrom(context, statement, moduleSpecifier, exportSpecifiers) {
    // First transpile as import clause
    const importClause = ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports(exportSpecifiers.map(s => ts.factory.createImportSpecifier(statement.isTypeOnly, s.propertyName, s.name))));
    const importDeclaration = ts.factory.createImportDeclaration(statement.modifiers, importClause, moduleSpecifier);
    // Wrap in block to prevent imports from hoisting out of `do` statement
    const [block] = (0, block_1.transformScopeBlock)(context, ts.factory.createBlock([importDeclaration]), scope_1.ScopeType.Block);
    const result = block.statements;
    // Now the module is imported, add the imports to the export table
    for (const specifier of exportSpecifiers) {
        result.push(lua.createAssignmentStatement((0, export_1.createExportedIdentifier)(context, (0, identifier_1.transformIdentifier)(context, specifier.name)), (0, identifier_1.transformIdentifier)(context, specifier.name)));
    }
    // Wrap this in a DoStatement to prevent polluting the scope.
    return lua.createDoStatement(result, statement);
}
const getExported = (context, exportSpecifiers) => exportSpecifiers.elements.filter(exportSpecifier => context.resolver.isValueAliasDeclaration(exportSpecifier));
exports.getExported = getExported;
const transformExportDeclaration = (node, context) => {
    if (!node.exportClause) {
        // export * from "...";
        return transformExportAll(context, node);
    }
    if (!context.resolver.isValueAliasDeclaration(node)) {
        return undefined;
    }
    if (ts.isNamespaceExport(node.exportClause)) {
        // export * as ns from "...";
        return transformExportAll(context, node);
    }
    const exportSpecifiers = (0, exports.getExported)(context, node.exportClause);
    // export { ... };
    if (!node.moduleSpecifier) {
        return exportSpecifiers.map(exportSpecifier => transformExportSpecifier(context, exportSpecifier));
    }
    // export { ... } from "...";
    return transformExportSpecifiersFrom(context, node, node.moduleSpecifier, exportSpecifiers);
};
exports.transformExportDeclaration = transformExportDeclaration;
//# sourceMappingURL=export.js.map
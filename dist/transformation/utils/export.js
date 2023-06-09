"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultExportExpression = exports.createExportedIdentifier = exports.addExportToIdentifier = exports.isSymbolExportedFromScope = exports.isSymbolExported = exports.getDependenciesOfSymbol = exports.getExportedSymbolsFromScope = exports.getSymbolExportScope = exports.getIdentifierExportScope = exports.getSymbolFromIdentifier = exports.getExportedSymbolDeclaration = exports.createDefaultExportStringLiteral = exports.hasExportModifier = exports.hasDefaultExportModifier = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const namespace_1 = require("../visitors/namespace");
const lua_ast_1 = require("./lua-ast");
const symbols_1 = require("./symbols");
const typescript_1 = require("./typescript");
function hasDefaultExportModifier(node) {
    var _a;
    return (ts.canHaveModifiers(node) &&
        ((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) === true);
}
exports.hasDefaultExportModifier = hasDefaultExportModifier;
function hasExportModifier(node) {
    var _a;
    return (ts.canHaveModifiers(node) &&
        ((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) === true);
}
exports.hasExportModifier = hasExportModifier;
const createDefaultExportStringLiteral = (original) => lua.createStringLiteral("default", original);
exports.createDefaultExportStringLiteral = createDefaultExportStringLiteral;
function getExportedSymbolDeclaration(symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations) {
        return declarations.find(d => (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) !== 0);
    }
}
exports.getExportedSymbolDeclaration = getExportedSymbolDeclaration;
function getSymbolFromIdentifier(context, identifier) {
    if (identifier.symbolId !== undefined) {
        const symbolInfo = (0, symbols_1.getSymbolInfo)(context, identifier.symbolId);
        if (symbolInfo !== undefined) {
            return symbolInfo.symbol;
        }
    }
}
exports.getSymbolFromIdentifier = getSymbolFromIdentifier;
function getIdentifierExportScope(context, identifier) {
    const symbol = getSymbolFromIdentifier(context, identifier);
    if (!symbol) {
        return undefined;
    }
    return getSymbolExportScope(context, symbol);
}
exports.getIdentifierExportScope = getIdentifierExportScope;
function isGlobalAugmentation(module) {
    return (module.flags & ts.NodeFlags.GlobalAugmentation) !== 0;
}
function getSymbolExportScope(context, symbol) {
    const exportedDeclaration = getExportedSymbolDeclaration(symbol);
    if (!exportedDeclaration) {
        return undefined;
    }
    const scope = (0, typescript_1.findFirstNodeAbove)(exportedDeclaration, (n) => ts.isSourceFile(n) || ts.isModuleDeclaration(n));
    if (!scope) {
        return undefined;
    }
    if (ts.isModuleDeclaration(scope) && isGlobalAugmentation(scope)) {
        return undefined;
    }
    if (!isSymbolExportedFromScope(context, symbol, scope)) {
        return undefined;
    }
    return scope;
}
exports.getSymbolExportScope = getSymbolExportScope;
function getExportedSymbolsFromScope(context, scope) {
    const scopeSymbol = context.checker.getSymbolAtLocation(ts.isSourceFile(scope) ? scope : scope.name);
    if ((scopeSymbol === null || scopeSymbol === void 0 ? void 0 : scopeSymbol.exports) === undefined) {
        return [];
    }
    // ts.Iterator is not a ES6-compatible iterator, because TypeScript targets ES5
    const it = { [Symbol.iterator]: () => scopeSymbol.exports.values() };
    return [...it];
}
exports.getExportedSymbolsFromScope = getExportedSymbolsFromScope;
function getDependenciesOfSymbol(context, originalSymbol) {
    return getExportedSymbolsFromScope(context, context.sourceFile).filter(exportSymbol => {
        var _a;
        return (_a = exportSymbol.declarations) === null || _a === void 0 ? void 0 : _a.filter(ts.isExportSpecifier).map(context.checker.getExportSpecifierLocalTargetSymbol).includes(originalSymbol);
    });
}
exports.getDependenciesOfSymbol = getDependenciesOfSymbol;
function isSymbolExported(context, symbol) {
    return (getExportedSymbolDeclaration(symbol) !== undefined ||
        // Symbol may have been exported separately (e.g. 'const foo = "bar"; export { foo }')
        isSymbolExportedFromScope(context, symbol, context.sourceFile));
}
exports.isSymbolExported = isSymbolExported;
function isSymbolExportedFromScope(context, symbol, scope) {
    return getExportedSymbolsFromScope(context, scope).includes(symbol);
}
exports.isSymbolExportedFromScope = isSymbolExportedFromScope;
function addExportToIdentifier(context, identifier) {
    const exportScope = getIdentifierExportScope(context, identifier);
    return exportScope ? createExportedIdentifier(context, identifier, exportScope) : identifier;
}
exports.addExportToIdentifier = addExportToIdentifier;
function createExportedIdentifier(context, identifier, exportScope) {
    if (!identifier.exportable) {
        return identifier;
    }
    const exportTable = exportScope && ts.isModuleDeclaration(exportScope)
        ? (0, namespace_1.createModuleLocalNameIdentifier)(context, exportScope)
        : (0, lua_ast_1.createExportsIdentifier)();
    return lua.createTableIndexExpression(exportTable, lua.createStringLiteral(identifier.text));
}
exports.createExportedIdentifier = createExportedIdentifier;
function createDefaultExportExpression(node) {
    return lua.createTableIndexExpression((0, lua_ast_1.createExportsIdentifier)(), (0, exports.createDefaultExportStringLiteral)(node), node);
}
exports.createDefaultExportExpression = createDefaultExportExpression;
//# sourceMappingURL=export.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFirstDeclaration = exports.getSymbolOfNode = exports.isInGeneratorFunction = exports.isInAsyncFunction = exports.isInDestructingAssignment = exports.isAmbientNode = exports.isDestructuringAssignment = exports.isAssignmentPattern = void 0;
const ts = require("typescript");
const _1 = require(".");
function isAssignmentPattern(node) {
    return ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node);
}
exports.isAssignmentPattern = isAssignmentPattern;
function isDestructuringAssignment(node) {
    return (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isAssignmentPattern(node.left));
}
exports.isDestructuringAssignment = isDestructuringAssignment;
function isAmbientNode(node) {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Ambient) !== 0;
}
exports.isAmbientNode = isAmbientNode;
function isInDestructingAssignment(node) {
    return (node.parent &&
        ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) ||
            (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left))));
}
exports.isInDestructingAssignment = isInDestructingAssignment;
function isInAsyncFunction(node) {
    var _a, _b;
    // Check if node is in function declaration with `async`
    const declaration = (0, _1.findFirstNodeAbove)(node, ts.isFunctionLike);
    if (!declaration) {
        return false;
    }
    if (ts.canHaveModifiers(declaration)) {
        return (_b = (_a = ts.getModifiers(declaration)) === null || _a === void 0 ? void 0 : _a.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) !== null && _b !== void 0 ? _b : false;
    }
    else {
        return false;
    }
}
exports.isInAsyncFunction = isInAsyncFunction;
function isInGeneratorFunction(node) {
    // Check if node is in function declaration with `async`
    const declaration = (0, _1.findFirstNodeAbove)(node, ts.isFunctionDeclaration);
    if (!declaration) {
        return false;
    }
    return declaration.asteriskToken !== undefined;
}
exports.isInGeneratorFunction = isInGeneratorFunction;
/**
 * Quite hacky, avoid unless absolutely necessary!
 */
function getSymbolOfNode(context, node) {
    var _a;
    return (_a = node.symbol) !== null && _a !== void 0 ? _a : context.checker.getSymbolAtLocation(node);
}
exports.getSymbolOfNode = getSymbolOfNode;
function isFirstDeclaration(context, node) {
    const symbol = getSymbolOfNode(context, node);
    return symbol ? symbol.valueDeclaration === node : true;
}
exports.isFirstDeclaration = isFirstDeclaration;
//# sourceMappingURL=nodes.js.map
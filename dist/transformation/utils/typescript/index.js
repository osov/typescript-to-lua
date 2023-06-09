"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConstIdentifier = exports.getFunctionTypeForCall = exports.isExpressionWithEvaluationEffect = exports.getAllCallSignatures = exports.inferAssignedType = exports.hasStandardLibrarySignature = exports.isStandardLibraryType = exports.isStandardLibraryDeclaration = exports.getFirstDeclarationInFile = exports.expressionResultIsUsed = exports.findFirstNonOuterParent = exports.findFirstNodeAbove = exports.hasExportEquals = void 0;
const ts = require("typescript");
__exportStar(require("./nodes"), exports);
__exportStar(require("./types"), exports);
// TODO: Move to separate files?
function hasExportEquals(sourceFile) {
    return sourceFile.statements.some(node => ts.isExportAssignment(node) && node.isExportEquals);
}
exports.hasExportEquals = hasExportEquals;
/**
 * Search up until finding a node satisfying the callback
 */
function findFirstNodeAbove(node, callback) {
    let current = node;
    while (current.parent) {
        if (callback(current.parent)) {
            return current.parent;
        }
        else {
            current = current.parent;
        }
    }
}
exports.findFirstNodeAbove = findFirstNodeAbove;
function findFirstNonOuterParent(node) {
    let current = ts.getOriginalNode(node).parent;
    while (ts.isOuterExpression(current)) {
        current = ts.getOriginalNode(current).parent;
    }
    return current;
}
exports.findFirstNonOuterParent = findFirstNonOuterParent;
function expressionResultIsUsed(node) {
    return !ts.isExpressionStatement(findFirstNonOuterParent(node));
}
exports.expressionResultIsUsed = expressionResultIsUsed;
function getFirstDeclarationInFile(symbol, sourceFile) {
    var _a, _b;
    const originalSourceFile = (_a = ts.getParseTreeNode(sourceFile)) !== null && _a !== void 0 ? _a : sourceFile;
    const declarations = ((_b = symbol.getDeclarations()) !== null && _b !== void 0 ? _b : []).filter(d => d.getSourceFile() === originalSourceFile);
    return declarations.length > 0 ? declarations.reduce((p, c) => (p.pos < c.pos ? p : c)) : undefined;
}
exports.getFirstDeclarationInFile = getFirstDeclarationInFile;
function isStandardLibraryDeclaration(context, declaration) {
    var _a;
    const parseTreeNode = (_a = ts.getParseTreeNode(declaration)) !== null && _a !== void 0 ? _a : declaration;
    const sourceFile = parseTreeNode.getSourceFile();
    if (!sourceFile) {
        return false;
    }
    return context.program.isSourceFileDefaultLibrary(sourceFile);
}
exports.isStandardLibraryDeclaration = isStandardLibraryDeclaration;
function isStandardLibraryType(context, type, name) {
    const symbol = type.getSymbol();
    if (!symbol || (name ? symbol.name !== name : symbol.name === "__type")) {
        return false;
    }
    // Assume to be lib function if no valueDeclaration exists
    const declaration = symbol.valueDeclaration;
    if (!declaration) {
        return true;
    }
    return isStandardLibraryDeclaration(context, declaration);
}
exports.isStandardLibraryType = isStandardLibraryType;
function hasStandardLibrarySignature(context, callExpression) {
    const signature = context.checker.getResolvedSignature(callExpression);
    return (signature === null || signature === void 0 ? void 0 : signature.declaration) ? isStandardLibraryDeclaration(context, signature.declaration) : false;
}
exports.hasStandardLibrarySignature = hasStandardLibrarySignature;
function inferAssignedType(context, expression) {
    var _a;
    return (_a = context.checker.getContextualType(expression)) !== null && _a !== void 0 ? _a : context.checker.getTypeAtLocation(expression);
}
exports.inferAssignedType = inferAssignedType;
function getAllCallSignatures(type) {
    return type.isUnion() ? type.types.flatMap(getAllCallSignatures) : type.getCallSignatures();
}
exports.getAllCallSignatures = getAllCallSignatures;
// Returns true for expressions that may have effects when evaluated
function isExpressionWithEvaluationEffect(node) {
    return !(ts.isLiteralExpression(node) || ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword);
}
exports.isExpressionWithEvaluationEffect = isExpressionWithEvaluationEffect;
function getFunctionTypeForCall(context, node) {
    const signature = context.checker.getResolvedSignature(node);
    if (!(signature === null || signature === void 0 ? void 0 : signature.declaration)) {
        return;
    }
    const typeDeclaration = findFirstNodeAbove(signature.declaration, ts.isTypeAliasDeclaration);
    if (!typeDeclaration) {
        return;
    }
    return context.checker.getTypeFromTypeNode(typeDeclaration.type);
}
exports.getFunctionTypeForCall = getFunctionTypeForCall;
function isConstIdentifier(context, node) {
    let identifier = node;
    if (ts.isComputedPropertyName(identifier)) {
        identifier = identifier.expression;
    }
    if (!ts.isIdentifier(identifier)) {
        return false;
    }
    const symbol = context.checker.getSymbolAtLocation(identifier);
    if (!(symbol === null || symbol === void 0 ? void 0 : symbol.declarations)) {
        return false;
    }
    return symbol.declarations.some(d => ts.isVariableDeclarationList(d.parent) && (d.parent.flags & ts.NodeFlags.Const) !== 0);
}
exports.isConstIdentifier = isConstIdentifier;
//# sourceMappingURL=index.js.map
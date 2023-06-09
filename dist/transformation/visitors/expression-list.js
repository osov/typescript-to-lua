"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformOrderedExpressions = exports.transformExpressionList = exports.moveToPrecedingTemp = exports.shouldMoveToTemp = void 0;
const assert = require("assert");
const ts = require("typescript");
const lua = require("../../LuaAST");
const context_1 = require("../context");
const lualib_1 = require("../utils/lualib");
const preceding_statements_1 = require("../utils/preceding-statements");
const typescript_1 = require("../utils/typescript");
const optional_chaining_1 = require("./optional-chaining");
function shouldMoveToTemp(context, expression, tsOriginal) {
    return (!lua.isLiteral(expression) &&
        !(lua.isIdentifier(expression) && expression.symbolId === context_1.tempSymbolId) && // Treat generated temps as consts
        !(tsOriginal &&
            ((0, typescript_1.isConstIdentifier)(context, tsOriginal) ||
                (0, optional_chaining_1.isOptionalContinuation)(tsOriginal) ||
                tsOriginal.kind === ts.SyntaxKind.ThisKeyword)));
}
exports.shouldMoveToTemp = shouldMoveToTemp;
// Cache an expression in a preceding statement and return the temp identifier
function moveToPrecedingTemp(context, expression, tsOriginal) {
    if (!shouldMoveToTemp(context, expression, tsOriginal)) {
        return expression;
    }
    const tempIdentifier = context.createTempNameForLuaExpression(expression);
    const tempDeclaration = lua.createVariableDeclarationStatement(tempIdentifier, expression, tsOriginal);
    context.addPrecedingStatements(tempDeclaration);
    return lua.cloneIdentifier(tempIdentifier, tsOriginal);
}
exports.moveToPrecedingTemp = moveToPrecedingTemp;
function transformExpressions(context, expressions) {
    const precedingStatements = [];
    const transformedExpressions = [];
    let lastPrecedingStatementsIndex = -1;
    for (let i = 0; i < expressions.length; ++i) {
        const { precedingStatements: expressionPrecedingStatements, result: expression } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(expressions[i]));
        transformedExpressions.push(expression);
        if (expressionPrecedingStatements.length > 0) {
            lastPrecedingStatementsIndex = i;
        }
        precedingStatements.push(expressionPrecedingStatements);
    }
    return { transformedExpressions, precedingStatements, lastPrecedingStatementsIndex };
}
function transformExpressionsUsingTemps(context, expressions, transformedExpressions, precedingStatements, lastPrecedingStatementsIndex) {
    for (let i = 0; i < transformedExpressions.length; ++i) {
        context.addPrecedingStatements(precedingStatements[i]);
        if (i < lastPrecedingStatementsIndex) {
            transformedExpressions[i] = moveToPrecedingTemp(context, transformedExpressions[i], expressions[i]);
        }
    }
    return transformedExpressions;
}
function pushToSparseArray(context, arrayIdentifier, expressions) {
    if (!arrayIdentifier) {
        arrayIdentifier = lua.createIdentifier(context.createTempName("array"));
        const libCall = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.SparseArrayNew, undefined, ...expressions);
        const declaration = lua.createVariableDeclarationStatement(arrayIdentifier, libCall);
        context.addPrecedingStatements(declaration);
    }
    else {
        const libCall = (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.SparseArrayPush, undefined, arrayIdentifier, ...expressions);
        context.addPrecedingStatements(lua.createExpressionStatement(libCall));
    }
    return arrayIdentifier;
}
function transformExpressionsUsingSparseArray(context, expressions, transformedExpressions, precedingStatements) {
    let arrayIdentifier;
    let expressionBatch = [];
    for (let i = 0; i < expressions.length; ++i) {
        // Expressions with preceding statements should always be at the start of a batch
        if (precedingStatements[i].length > 0 && expressionBatch.length > 0) {
            arrayIdentifier = pushToSparseArray(context, arrayIdentifier, expressionBatch);
            expressionBatch = [];
        }
        context.addPrecedingStatements(precedingStatements[i]);
        expressionBatch.push(transformedExpressions[i]);
        // Spread expressions should always be at the end of a batch
        if (ts.isSpreadElement(expressions[i])) {
            arrayIdentifier = pushToSparseArray(context, arrayIdentifier, expressionBatch);
            expressionBatch = [];
        }
    }
    if (expressionBatch.length > 0) {
        arrayIdentifier = pushToSparseArray(context, arrayIdentifier, expressionBatch);
    }
    assert(arrayIdentifier);
    return [(0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.SparseArraySpread, undefined, arrayIdentifier)];
}
function countNeededTemps(context, expressions, transformedExpressions, lastPrecedingStatementsIndex) {
    if (lastPrecedingStatementsIndex < 0) {
        return 0;
    }
    return transformedExpressions
        .slice(0, lastPrecedingStatementsIndex)
        .filter((e, i) => shouldMoveToTemp(context, e, expressions[i])).length;
}
// Transforms a list of expressions while flattening spreads and maintaining execution order
function transformExpressionList(context, expressions) {
    const { transformedExpressions, precedingStatements, lastPrecedingStatementsIndex } = transformExpressions(context, expressions);
    // If more than this number of temps are required to preserve execution order, we'll fall back to using the
    // sparse array lib functions instead to prevent excessive locals.
    const maxTemps = 2;
    // Use sparse array lib if there are spreads before the last expression
    // or if too many temps are needed to preserve order
    const lastSpread = expressions.findIndex(e => ts.isSpreadElement(e));
    if ((lastSpread >= 0 && lastSpread < expressions.length - 1) ||
        countNeededTemps(context, expressions, transformedExpressions, lastPrecedingStatementsIndex) > maxTemps) {
        return transformExpressionsUsingSparseArray(context, expressions, transformedExpressions, precedingStatements);
    }
    else {
        return transformExpressionsUsingTemps(context, expressions, transformedExpressions, precedingStatements, lastPrecedingStatementsIndex);
    }
}
exports.transformExpressionList = transformExpressionList;
// Transforms a series of expressions while maintaining execution order
function transformOrderedExpressions(context, expressions) {
    const { transformedExpressions, precedingStatements, lastPrecedingStatementsIndex } = transformExpressions(context, expressions);
    return transformExpressionsUsingTemps(context, expressions, transformedExpressions, precedingStatements, lastPrecedingStatementsIndex);
}
exports.transformOrderedExpressions = transformOrderedExpressions;
//# sourceMappingURL=expression-list.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typescriptVisitors = void 0;
const ts = require("typescript");
const assignment_validation_1 = require("../utils/assignment-validation");
const transformAssertionExpression = (expression, context) => {
    if (!ts.isConstTypeReference(expression.type)) {
        (0, assignment_validation_1.validateAssignment)(context, expression, context.checker.getTypeAtLocation(expression.expression), context.checker.getTypeAtLocation(expression.type));
    }
    return context.transformExpression(expression.expression);
};
exports.typescriptVisitors = {
    [ts.SyntaxKind.TypeAliasDeclaration]: () => undefined,
    [ts.SyntaxKind.InterfaceDeclaration]: () => undefined,
    [ts.SyntaxKind.NonNullExpression]: (node, context) => context.transformExpression(node.expression),
    [ts.SyntaxKind.ExpressionWithTypeArguments]: (node, context) => context.transformExpression(node.expression),
    [ts.SyntaxKind.SatisfiesExpression]: (node, context) => context.transformExpression(node.expression),
    [ts.SyntaxKind.AsExpression]: transformAssertionExpression,
    [ts.SyntaxKind.TypeAssertionExpression]: transformAssertionExpression,
    [ts.SyntaxKind.NotEmittedStatement]: () => undefined,
};
//# sourceMappingURL=typescript.js.map
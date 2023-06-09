"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformTaggedTemplateExpression = exports.transformTemplateExpression = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const function_context_1 = require("../utils/function-context");
const lua_ast_1 = require("../utils/lua-ast");
const typescript_1 = require("../utils/typescript");
const call_1 = require("./call");
const expression_list_1 = require("./expression-list");
// TODO: Source positions
function getRawLiteral(node) {
    let text = node.getText();
    const isLast = node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral || node.kind === ts.SyntaxKind.TemplateTail;
    text = text.substring(1, text.length - (isLast ? 1 : 2));
    text = text.replace(/\r\n?/g, "\n");
    return text;
}
const transformTemplateExpression = (node, context) => {
    const parts = [];
    const head = node.head.text;
    if (head.length > 0) {
        parts.push(lua.createStringLiteral(head, node.head));
    }
    const transformedExpressions = (0, expression_list_1.transformOrderedExpressions)(context, node.templateSpans.map(s => s.expression));
    for (let i = 0; i < node.templateSpans.length; ++i) {
        const span = node.templateSpans[i];
        const expression = transformedExpressions[i];
        const spanType = context.checker.getTypeAtLocation(span.expression);
        if ((0, typescript_1.isStringType)(context, spanType)) {
            parts.push(expression);
        }
        else {
            parts.push((0, lua_ast_1.wrapInToStringForConcat)(expression));
        }
        const text = span.literal.text;
        if (text.length > 0) {
            parts.push(lua.createStringLiteral(text, span.literal));
        }
    }
    return parts.reduce((prev, current) => lua.createBinaryExpression(prev, current, lua.SyntaxKind.ConcatOperator));
};
exports.transformTemplateExpression = transformTemplateExpression;
const transformTaggedTemplateExpression = (expression, context) => {
    const strings = [];
    const rawStrings = [];
    const expressions = [];
    if (ts.isTemplateExpression(expression.template)) {
        // Expressions are in the string.
        strings.push(expression.template.head.text);
        rawStrings.push(getRawLiteral(expression.template.head));
        strings.push(...expression.template.templateSpans.map(span => span.literal.text));
        rawStrings.push(...expression.template.templateSpans.map(span => getRawLiteral(span.literal)));
        expressions.push(...expression.template.templateSpans.map(span => span.expression));
    }
    else {
        // No expressions are in the string.
        strings.push(expression.template.text);
        rawStrings.push(getRawLiteral(expression.template));
    }
    // Construct table with strings and literal strings
    const rawStringsArray = ts.factory.createArrayLiteralExpression(rawStrings.map(text => ts.factory.createStringLiteral(text)));
    const stringObject = ts.factory.createObjectLiteralExpression([
        ...strings.map((partialString, i) => ts.factory.createPropertyAssignment(ts.factory.createNumericLiteral(i + 1), ts.factory.createStringLiteral(partialString))),
        ts.factory.createPropertyAssignment("raw", rawStringsArray),
    ]);
    expressions.unshift(stringObject);
    // Evaluate if there is a self parameter to be used.
    const signature = context.checker.getResolvedSignature(expression);
    const signatureDeclaration = signature === null || signature === void 0 ? void 0 : signature.getDeclaration();
    const useSelfParameter = signatureDeclaration && (0, function_context_1.getDeclarationContextType)(context, signatureDeclaration) !== function_context_1.ContextType.Void;
    if (useSelfParameter) {
        return (0, call_1.transformContextualCallExpression)(context, expression, expressions, signature);
    }
    // Argument evaluation.
    const callArguments = (0, call_1.transformArguments)(context, expressions, signature);
    const leftHandSideExpression = context.transformExpression(expression.tag);
    return lua.createCallExpression(leftHandSideExpression, callArguments);
};
exports.transformTaggedTemplateExpression = transformTaggedTemplateExpression;
//# sourceMappingURL=template.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformQualifiedName = exports.transformPropertyAccessExpressionWithCapture = exports.transformPropertyAccessExpression = exports.transformElementAccessExpressionWithCapture = exports.transformElementAccessExpression = exports.transformElementAccessArgument = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const builtins_1 = require("../builtins");
const annotations_1 = require("../utils/annotations");
const diagnostics_1 = require("../utils/diagnostics");
const language_extensions_1 = require("../utils/language-extensions");
const lua_ast_1 = require("../utils/lua-ast");
const lualib_1 = require("../utils/lualib");
const typescript_1 = require("../utils/typescript");
const enum_1 = require("./enum");
const expression_list_1 = require("./expression-list");
const call_extension_1 = require("./language-extensions/call-extension");
const multi_1 = require("./language-extensions/multi");
const optional_chaining_1 = require("./optional-chaining");
function addOneToArrayAccessArgument(context, node, index) {
    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if ((0, typescript_1.isArrayType)(context, type) && (0, typescript_1.isNumberType)(context, argumentType)) {
        return (0, lua_ast_1.addToNumericExpression)(index, 1);
    }
    return index;
}
function transformElementAccessArgument(context, node) {
    const index = context.transformExpression(node.argumentExpression);
    return addOneToArrayAccessArgument(context, node, index);
}
exports.transformElementAccessArgument = transformElementAccessArgument;
const transformElementAccessExpression = (node, context) => transformElementAccessExpressionWithCapture(context, node, undefined).expression;
exports.transformElementAccessExpression = transformElementAccessExpression;
function transformElementAccessExpressionWithCapture(context, node, thisValueCapture) {
    const constEnumValue = (0, enum_1.tryGetConstEnumValue)(context, node);
    if (constEnumValue) {
        return { expression: constEnumValue };
    }
    if (ts.isOptionalChain(node)) {
        return (0, optional_chaining_1.transformOptionalChainWithCapture)(context, node, thisValueCapture);
    }
    const [table, accessExpression] = (0, expression_list_1.transformOrderedExpressions)(context, [node.expression, node.argumentExpression]);
    const type = context.checker.getTypeAtLocation(node.expression);
    const argumentType = context.checker.getTypeAtLocation(node.argumentExpression);
    if ((0, typescript_1.isStringType)(context, type) && (0, typescript_1.isNumberType)(context, argumentType)) {
        // strings are not callable, so ignore thisValueCapture
        return {
            expression: (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.StringAccess, node, table, accessExpression),
        };
    }
    const updatedAccessExpression = addOneToArrayAccessArgument(context, node, accessExpression);
    if ((0, multi_1.isMultiReturnCall)(context, node.expression)) {
        const accessType = context.checker.getTypeAtLocation(node.argumentExpression);
        if (!(0, typescript_1.isNumberType)(context, accessType)) {
            context.diagnostics.push((0, diagnostics_1.invalidMultiReturnAccess)(node));
        }
        // When selecting the first element, we can shortcut
        if (ts.isNumericLiteral(node.argumentExpression) && node.argumentExpression.text === "0") {
            return { expression: table };
        }
        else {
            const selectIdentifier = lua.createIdentifier("select");
            return { expression: lua.createCallExpression(selectIdentifier, [updatedAccessExpression, table]) };
        }
    }
    if (thisValueCapture) {
        const thisValue = (0, optional_chaining_1.captureThisValue)(context, table, thisValueCapture, node.expression);
        return {
            expression: lua.createTableIndexExpression(thisValue, updatedAccessExpression, node),
            thisValue,
        };
    }
    return { expression: lua.createTableIndexExpression(table, updatedAccessExpression, node) };
}
exports.transformElementAccessExpressionWithCapture = transformElementAccessExpressionWithCapture;
const transformPropertyAccessExpression = (node, context) => transformPropertyAccessExpressionWithCapture(context, node, undefined).expression;
exports.transformPropertyAccessExpression = transformPropertyAccessExpression;
function transformPropertyAccessExpressionWithCapture(context, node, thisValueCapture) {
    const property = node.name.text;
    const type = context.checker.getTypeAtLocation(node.expression);
    const isOptionalLeft = (0, optional_chaining_1.isOptionalContinuation)(node.expression);
    const constEnumValue = (0, enum_1.tryGetConstEnumValue)(context, node);
    if (constEnumValue) {
        return { expression: constEnumValue };
    }
    if (ts.isCallExpression(node.expression) && (0, multi_1.returnsMultiType)(context, node.expression)) {
        context.diagnostics.push((0, diagnostics_1.invalidMultiReturnAccess)(node));
    }
    if (ts.isOptionalChain(node)) {
        return (0, optional_chaining_1.transformOptionalChainWithCapture)(context, node, thisValueCapture);
    }
    // Do not output path for member only enums
    const annotations = (0, annotations_1.getTypeAnnotations)(type);
    if (annotations.has(annotations_1.AnnotationKind.CompileMembersOnly)) {
        if (isOptionalLeft) {
            context.diagnostics.push((0, diagnostics_1.unsupportedOptionalCompileMembersOnly)(node));
        }
        if (ts.isPropertyAccessExpression(node.expression)) {
            // in case of ...x.enum.y transform to ...x.y
            const expression = lua.createTableIndexExpression(context.transformExpression(node.expression.expression), lua.createStringLiteral(property), node);
            return { expression };
        }
        else {
            return { expression: lua.createIdentifier(property, node) };
        }
    }
    const builtinResult = (0, builtins_1.transformBuiltinPropertyAccessExpression)(context, node);
    if (builtinResult) {
        // Ignore thisValueCapture.
        // This assumes that nothing returned by builtin property accesses are callable.
        // If this assumption is no longer true, this may need to be updated.
        return { expression: builtinResult };
    }
    if (ts.isIdentifier(node.expression) &&
        node.parent &&
        (!ts.isCallExpression(node.parent) || node.parent.expression !== node)) {
        // Check if this is a method call extension that is not used as a call
        const extensionType = (0, language_extensions_1.getExtensionKindForNode)(context, node);
        if (extensionType && call_extension_1.callExtensions.has(extensionType)) {
            context.diagnostics.push((0, diagnostics_1.invalidCallExtensionUse)(node));
        }
    }
    const table = context.transformExpression(node.expression);
    if (thisValueCapture) {
        const thisValue = (0, optional_chaining_1.captureThisValue)(context, table, thisValueCapture, node.expression);
        const expression = lua.createTableIndexExpression(thisValue, lua.createStringLiteral(property), node);
        return {
            expression,
            thisValue,
        };
    }
    return { expression: lua.createTableIndexExpression(table, lua.createStringLiteral(property), node) };
}
exports.transformPropertyAccessExpressionWithCapture = transformPropertyAccessExpressionWithCapture;
const transformQualifiedName = (node, context) => {
    const right = lua.createStringLiteral(node.right.text, node.right);
    const left = context.transformExpression(node.left);
    return lua.createTableIndexExpression(left, right, node);
};
exports.transformQualifiedName = transformQualifiedName;
//# sourceMappingURL=access.js.map
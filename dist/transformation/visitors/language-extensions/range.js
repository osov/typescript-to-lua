"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformRangeStatement = exports.isRangeFunctionNode = exports.isRangeFunction = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const extensions = require("../../utils/language-extensions");
const utils_1 = require("../loops/utils");
const identifier_1 = require("../identifier");
const call_1 = require("../call");
const utils_2 = require("../../../utils");
const diagnostics_1 = require("../../utils/diagnostics");
const language_extensions_1 = require("../../utils/language-extensions");
function isRangeFunction(context, expression) {
    return isRangeFunctionNode(context, expression.expression);
}
exports.isRangeFunction = isRangeFunction;
function isRangeFunctionNode(context, node) {
    return (ts.isIdentifier(node) &&
        node.text === "$range" &&
        (0, language_extensions_1.getExtensionKindForNode)(context, node) === extensions.ExtensionKind.RangeFunction);
}
exports.isRangeFunctionNode = isRangeFunctionNode;
function getControlVariable(context, statement) {
    if (!ts.isVariableDeclarationList(statement.initializer)) {
        context.diagnostics.push((0, diagnostics_1.invalidRangeControlVariable)(statement.initializer));
        return;
    }
    const binding = (0, utils_1.getVariableDeclarationBinding)(context, statement.initializer);
    if (!ts.isIdentifier(binding)) {
        context.diagnostics.push((0, diagnostics_1.invalidRangeControlVariable)(statement.initializer));
        return;
    }
    return (0, identifier_1.transformIdentifier)(context, binding);
}
function transformRangeStatement(context, statement, block) {
    var _a;
    (0, utils_2.assert)(ts.isCallExpression(statement.expression));
    const controlVariable = (_a = getControlVariable(context, statement)) !== null && _a !== void 0 ? _a : lua.createAnonymousIdentifier(statement.initializer);
    const [start = lua.createNumericLiteral(0), limit = lua.createNumericLiteral(0), step] = (0, call_1.transformArguments)(context, statement.expression.arguments, context.checker.getResolvedSignature(statement.expression));
    return lua.createForStatement(block, controlVariable, start, limit, step, statement);
}
exports.transformRangeStatement = transformRangeStatement;
//# sourceMappingURL=range.js.map
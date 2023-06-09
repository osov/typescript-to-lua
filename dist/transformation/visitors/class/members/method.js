"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMethodDecoratingExpression = exports.transformMethodDeclaration = exports.transformMethodName = exports.transformMemberExpressionOwnerName = void 0;
const ts = require("typescript");
const lua = require("../../../../LuaAST");
const function_1 = require("../../function");
const literal_1 = require("../../literal");
const utils_1 = require("../utils");
const decorators_1 = require("../decorators");
const constructor_1 = require("./constructor");
const lualib_1 = require("../../../utils/lualib");
const utils_2 = require("../../../../utils");
function transformMemberExpressionOwnerName(node, className) {
    return (0, utils_1.isStaticNode)(node) ? lua.cloneIdentifier(className) : (0, constructor_1.createPrototypeName)(className);
}
exports.transformMemberExpressionOwnerName = transformMemberExpressionOwnerName;
function transformMethodName(context, node) {
    const methodName = (0, literal_1.transformPropertyName)(context, node.name);
    if (lua.isStringLiteral(methodName) && methodName.value === "toString") {
        return lua.createStringLiteral("__tostring", node.name);
    }
    return methodName;
}
exports.transformMethodName = transformMethodName;
function transformMethodDeclaration(context, node, className) {
    // Don't transform methods without body (overload declarations)
    if (!node.body)
        return;
    const methodTable = transformMemberExpressionOwnerName(node, className);
    const methodName = transformMethodName(context, node);
    const [functionExpression] = (0, function_1.transformFunctionToExpression)(context, node);
    return lua.createAssignmentStatement(lua.createTableIndexExpression(methodTable, methodName), functionExpression, node);
}
exports.transformMethodDeclaration = transformMethodDeclaration;
function createMethodDecoratingExpression(context, node, className) {
    var _a, _b;
    const methodTable = transformMemberExpressionOwnerName(node, className);
    const methodName = transformMethodName(context, node);
    const parameterDecorators = node.parameters
        .flatMap((parameter, index) => {
        var _a;
        return (_a = ts
            .getDecorators(parameter)) === null || _a === void 0 ? void 0 : _a.map(decorator => (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.DecorateParam, node, lua.createNumericLiteral(index), (0, decorators_1.transformDecoratorExpression)(context, decorator)));
    })
        .filter(utils_2.isNonNull);
    const methodDecorators = (_b = (_a = ts.getDecorators(node)) === null || _a === void 0 ? void 0 : _a.map(d => (0, decorators_1.transformDecoratorExpression)(context, d))) !== null && _b !== void 0 ? _b : [];
    if (methodDecorators.length > 0 || parameterDecorators.length > 0) {
        const decorateMethod = (0, decorators_1.createDecoratingExpression)(context, node.kind, [...methodDecorators, ...parameterDecorators], methodTable, methodName);
        return lua.createExpressionStatement(decorateMethod);
    }
}
exports.createMethodDecoratingExpression = createMethodDecoratingExpression;
//# sourceMappingURL=method.js.map
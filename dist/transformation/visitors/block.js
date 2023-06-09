"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformBlock = exports.transformScopeBlock = exports.transformBlockOrStatement = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const scope_1 = require("../utils/scope");
function transformBlockOrStatement(context, statement) {
    return context.transformStatements(ts.isBlock(statement) ? statement.statements : statement);
}
exports.transformBlockOrStatement = transformBlockOrStatement;
function transformScopeBlock(context, node, scopeType) {
    context.pushScope(scopeType);
    const statements = (0, scope_1.performHoisting)(context, context.transformStatements(node.statements));
    const scope = context.popScope();
    return [lua.createBlock(statements, node), scope];
}
exports.transformScopeBlock = transformScopeBlock;
const transformBlock = (node, context) => {
    context.pushScope(scope_1.ScopeType.Block);
    const statements = (0, scope_1.performHoisting)(context, context.transformStatements(node.statements));
    context.popScope();
    return lua.createDoStatement(statements, node);
};
exports.transformBlock = transformBlock;
//# sourceMappingURL=block.js.map
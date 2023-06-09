"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformStaticPropertyDeclaration = exports.transformClassInstanceFields = exports.createPropertyDecoratingExpression = void 0;
const ts = require("typescript");
const lua = require("../../../../LuaAST");
const lua_ast_1 = require("../../../utils/lua-ast");
const preceding_statements_1 = require("../../../utils/preceding-statements");
const literal_1 = require("../../literal");
const decorators_1 = require("../decorators");
const method_1 = require("./method");
function createPropertyDecoratingExpression(context, node, className) {
    if (!ts.canHaveDecorators(node))
        return;
    const decorators = ts.getDecorators(node);
    if (!decorators)
        return;
    const propertyName = (0, literal_1.transformPropertyName)(context, node.name);
    const propertyOwnerTable = (0, method_1.transformMemberExpressionOwnerName)(node, className);
    return (0, decorators_1.createDecoratingExpression)(context, node.kind, decorators.map(d => (0, decorators_1.transformDecoratorExpression)(context, d)), propertyOwnerTable, propertyName);
}
exports.createPropertyDecoratingExpression = createPropertyDecoratingExpression;
function transformClassInstanceFields(context, instanceFields) {
    const statements = [];
    for (const f of instanceFields) {
        const { precedingStatements, result: statement } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => {
            // Get identifier
            const fieldName = (0, literal_1.transformPropertyName)(context, f.name);
            const value = f.initializer ? context.transformExpression(f.initializer) : undefined;
            // self[fieldName]
            const selfIndex = lua.createTableIndexExpression((0, lua_ast_1.createSelfIdentifier)(), fieldName);
            // self[fieldName] = value
            const assignClassField = lua.createAssignmentStatement(selfIndex, value, f);
            return assignClassField;
        });
        statements.push(...precedingStatements, statement);
    }
    return statements;
}
exports.transformClassInstanceFields = transformClassInstanceFields;
function transformStaticPropertyDeclaration(context, field, className) {
    if (!field.initializer)
        return;
    const fieldName = (0, literal_1.transformPropertyName)(context, field.name);
    const value = context.transformExpression(field.initializer);
    const classField = lua.createTableIndexExpression(lua.cloneIdentifier(className), fieldName);
    return lua.createAssignmentStatement(classField, value);
}
exports.transformStaticPropertyDeclaration = transformStaticPropertyDeclaration;
//# sourceMappingURL=fields.js.map
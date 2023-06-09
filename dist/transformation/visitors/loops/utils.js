"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invertCondition = exports.transformForInitializer = exports.getVariableDeclarationBinding = exports.transformLoopBody = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const preceding_statements_1 = require("../../utils/preceding-statements");
const scope_1 = require("../../utils/scope");
const typescript_1 = require("../../utils/typescript");
const assignments_1 = require("../binary-expression/assignments");
const destructuring_assignments_1 = require("../binary-expression/destructuring-assignments");
const block_1 = require("../block");
const identifier_1 = require("../identifier");
const variable_declaration_1 = require("../variable-declaration");
function transformLoopBody(context, loop) {
    context.pushScope(scope_1.ScopeType.Loop);
    const body = (0, scope_1.performHoisting)(context, (0, block_1.transformBlockOrStatement)(context, loop.statement));
    const scope = context.popScope();
    const scopeId = scope.id;
    if (!scope.loopContinued) {
        return body;
    }
    const baseResult = [lua.createDoStatement(body)];
    const continueLabel = lua.createLabelStatement(`__continue${scopeId}`);
    baseResult.push(continueLabel);
    return baseResult;
}
exports.transformLoopBody = transformLoopBody;
function getVariableDeclarationBinding(context, node) {
    (0, variable_declaration_1.checkVariableDeclarationList)(context, node);
    if (node.declarations.length === 0) {
        return ts.factory.createIdentifier("____");
    }
    return node.declarations[0].name;
}
exports.getVariableDeclarationBinding = getVariableDeclarationBinding;
function transformForInitializer(context, initializer, block) {
    const valueVariable = lua.createIdentifier("____value");
    context.pushScope(scope_1.ScopeType.LoopInitializer);
    if (ts.isVariableDeclarationList(initializer)) {
        // Declaration of new variable
        const binding = getVariableDeclarationBinding(context, initializer);
        if (ts.isArrayBindingPattern(binding) || ts.isObjectBindingPattern(binding)) {
            const { precedingStatements, result: bindings } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, variable_declaration_1.transformBindingPattern)(context, binding, valueVariable));
            block.statements.unshift(...precedingStatements, ...bindings);
        }
        else {
            // Single variable declared in for loop
            context.popScope();
            return (0, identifier_1.transformIdentifier)(context, binding);
        }
    }
    else {
        // Assignment to existing variable(s)
        block.statements.unshift(...((0, typescript_1.isAssignmentPattern)(initializer)
            ? (0, destructuring_assignments_1.transformAssignmentPattern)(context, initializer, valueVariable, false)
            : (0, assignments_1.transformAssignment)(context, initializer, valueVariable)));
    }
    context.popScope();
    return valueVariable;
}
exports.transformForInitializer = transformForInitializer;
function invertCondition(expression) {
    if (lua.isUnaryExpression(expression) && expression.operator === lua.SyntaxKind.NotOperator) {
        return expression.operand;
    }
    else {
        const notExpression = lua.createUnaryExpression(expression, lua.SyntaxKind.NotOperator);
        lua.setNodePosition(notExpression, lua.getOriginalPos(expression));
        return notExpression;
    }
}
exports.invertCondition = invertCondition;
//# sourceMappingURL=utils.js.map
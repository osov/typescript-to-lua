"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformDoStatement = exports.transformWhileStatement = void 0;
const lua = require("../../../LuaAST");
const preceding_statements_1 = require("../../utils/preceding-statements");
const conditional_1 = require("../conditional");
const utils_1 = require("./utils");
const transformWhileStatement = (statement, context) => {
    // Check if we need to add diagnostic about Lua truthiness
    (0, conditional_1.checkOnlyTruthyCondition)(statement.expression, context);
    const body = (0, utils_1.transformLoopBody)(context, statement);
    let { precedingStatements: conditionPrecedingStatements, result: condition } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(statement.expression));
    // If condition has preceding statements, ensure they are executed every iteration by using the form:
    //
    // while true do
    //     condition's preceding statements
    //     if not condition then
    //         break
    //     end
    //     ...
    // end
    if (conditionPrecedingStatements.length > 0) {
        conditionPrecedingStatements.push(lua.createIfStatement((0, utils_1.invertCondition)(condition), lua.createBlock([lua.createBreakStatement()]), undefined, statement.expression));
        body.unshift(...conditionPrecedingStatements);
        condition = lua.createBooleanLiteral(true);
    }
    return lua.createWhileStatement(lua.createBlock(body), condition, statement);
};
exports.transformWhileStatement = transformWhileStatement;
const transformDoStatement = (statement, context) => {
    // Check if we need to add diagnostic about Lua truthiness
    (0, conditional_1.checkOnlyTruthyCondition)(statement.expression, context);
    const body = lua.createDoStatement((0, utils_1.transformLoopBody)(context, statement));
    let { precedingStatements: conditionPrecedingStatements, result: condition } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, utils_1.invertCondition)(context.transformExpression(statement.expression)));
    // If condition has preceding statements, ensure they are executed every iteration by using the form:
    //
    // repeat
    //     ...
    //     condition's preceding statements
    //     if condition then
    //         break
    //     end
    // end
    if (conditionPrecedingStatements.length > 0) {
        conditionPrecedingStatements.push(lua.createIfStatement(condition, lua.createBlock([lua.createBreakStatement()]), undefined, statement.expression));
        condition = lua.createBooleanLiteral(false);
    }
    return lua.createRepeatStatement(lua.createBlock([body, ...conditionPrecedingStatements]), condition, statement);
};
exports.transformDoStatement = transformDoStatement;
//# sourceMappingURL=do-while.js.map
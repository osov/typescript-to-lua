"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformForStatement = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const preceding_statements_1 = require("../../utils/preceding-statements");
const variable_declaration_1 = require("../variable-declaration");
const utils_1 = require("./utils");
const transformForStatement = (statement, context) => {
    const result = [];
    if (statement.initializer) {
        if (ts.isVariableDeclarationList(statement.initializer)) {
            (0, variable_declaration_1.checkVariableDeclarationList)(context, statement.initializer);
            // local initializer = value
            result.push(...statement.initializer.declarations.flatMap(d => (0, variable_declaration_1.transformVariableDeclaration)(context, d)));
        }
        else {
            result.push(...context.transformStatements(ts.factory.createExpressionStatement(statement.initializer)));
        }
    }
    const body = (0, utils_1.transformLoopBody)(context, statement);
    let condition;
    if (statement.condition) {
        const tsCondition = statement.condition;
        const { precedingStatements: conditionPrecedingStatements, result } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(tsCondition));
        condition = result;
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
            conditionPrecedingStatements.push(lua.createIfStatement((0, utils_1.invertCondition)(condition), lua.createBlock([lua.createBreakStatement()]), undefined, statement.condition));
            body.unshift(...conditionPrecedingStatements);
            condition = lua.createBooleanLiteral(true);
        }
    }
    else {
        condition = lua.createBooleanLiteral(true);
    }
    if (statement.incrementor) {
        body.push(...context.transformStatements(ts.factory.createExpressionStatement(statement.incrementor)));
    }
    // while (condition) do ... end
    result.push(lua.createWhileStatement(lua.createBlock(body), condition, statement));
    return lua.createDoStatement(result, statement);
};
exports.transformForStatement = transformForStatement;
//# sourceMappingURL=for.js.map
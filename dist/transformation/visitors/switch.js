"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSwitchStatement = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const preceding_statements_1 = require("../utils/preceding-statements");
const scope_1 = require("../utils/scope");
const binary_expression_1 = require("./binary-expression");
const containsBreakOrReturn = (nodes) => {
    for (const s of nodes) {
        if (ts.isBreakStatement(s) || ts.isReturnStatement(s)) {
            return true;
        }
        else if (ts.isBlock(s) && containsBreakOrReturn(s.getChildren())) {
            return true;
        }
        else if (s.kind === ts.SyntaxKind.SyntaxList && containsBreakOrReturn(s.getChildren())) {
            return true;
        }
    }
    return false;
};
const createOrExpression = (context, left, right, rightPrecedingStatements) => {
    if (rightPrecedingStatements.length > 0) {
        return (0, binary_expression_1.createShortCircuitBinaryExpressionPrecedingStatements)(context, left, right, rightPrecedingStatements, ts.SyntaxKind.BarBarToken);
    }
    else {
        return {
            precedingStatements: rightPrecedingStatements,
            result: lua.createBinaryExpression(left, right, lua.SyntaxKind.OrOperator),
        };
    }
};
const coalesceCondition = (condition, conditionPrecedingStatements, switchVariable, expression, context) => {
    const { precedingStatements, result: transformedExpression } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => context.transformExpression(expression));
    // Coalesce skipped statements
    const comparison = lua.createBinaryExpression(switchVariable, transformedExpression, lua.SyntaxKind.EqualityOperator);
    if (condition) {
        return createOrExpression(context, condition, comparison, precedingStatements);
    }
    // Next condition
    return { precedingStatements: [...conditionPrecedingStatements, ...precedingStatements], result: comparison };
};
const transformSwitchStatement = (statement, context) => {
    const scope = context.pushScope(scope_1.ScopeType.Switch);
    // Give the switch and condition accumulator a unique name to prevent nested switches from acting up.
    const switchName = `____switch${scope.id}`;
    const conditionName = `____cond${scope.id}`;
    const switchVariable = lua.createIdentifier(switchName);
    const conditionVariable = lua.createIdentifier(conditionName);
    // If the switch only has a default clause, wrap it in a single do.
    // Otherwise, we need to generate a set of if statements to emulate the switch.
    const statements = [];
    const hoistedStatements = [];
    const hoistedIdentifiers = [];
    const clauses = statement.caseBlock.clauses;
    if (clauses.length === 1 && ts.isDefaultClause(clauses[0])) {
        const defaultClause = clauses[0].statements;
        if (defaultClause.length) {
            const { statements: defaultStatements, hoistedStatements: defaultHoistedStatements, hoistedIdentifiers: defaultHoistedIdentifiers, } = (0, scope_1.separateHoistedStatements)(context, context.transformStatements(defaultClause));
            hoistedStatements.push(...defaultHoistedStatements);
            hoistedIdentifiers.push(...defaultHoistedIdentifiers);
            statements.push(lua.createDoStatement(defaultStatements));
        }
    }
    else {
        // Build up the condition for each if statement
        let defaultTransformed = false;
        let isInitialCondition = true;
        let condition = undefined;
        let conditionPrecedingStatements = [];
        for (let i = 0; i < clauses.length; i++) {
            const clause = clauses[i];
            const previousClause = clauses[i - 1];
            // Skip redundant default clauses, will be handled in final default case
            if (i === 0 && ts.isDefaultClause(clause))
                continue;
            if (ts.isDefaultClause(clause) && previousClause && containsBreakOrReturn(previousClause.statements)) {
                continue;
            }
            // Compute the condition for the if statement
            if (!ts.isDefaultClause(clause)) {
                const { precedingStatements, result } = coalesceCondition(condition, conditionPrecedingStatements, switchVariable, clause.expression, context);
                conditionPrecedingStatements = precedingStatements;
                condition = result;
                // Skip empty clauses unless final clause (i.e side-effects)
                if (i !== clauses.length - 1 && clause.statements.length === 0)
                    continue;
                // Declare or assign condition variable
                if (isInitialCondition) {
                    statements.push(...conditionPrecedingStatements, lua.createVariableDeclarationStatement(conditionVariable, condition));
                }
                else {
                    const { precedingStatements, result } = createOrExpression(context, conditionVariable, condition, conditionPrecedingStatements);
                    conditionPrecedingStatements = precedingStatements;
                    condition = result;
                    statements.push(...conditionPrecedingStatements, lua.createAssignmentStatement(conditionVariable, condition));
                }
                isInitialCondition = false;
            }
            else {
                // If the default is proceeded by empty clauses and will be emitted we may need to initialize the condition
                if (isInitialCondition) {
                    statements.push(...conditionPrecedingStatements, lua.createVariableDeclarationStatement(conditionVariable, condition !== null && condition !== void 0 ? condition : lua.createBooleanLiteral(false)));
                    // Clear condition ot ensure it is not evaluated twice
                    condition = undefined;
                    conditionPrecedingStatements = [];
                    isInitialCondition = false;
                }
                // Allow default to fallthrough to final default clause
                if (i === clauses.length - 1) {
                    // Evaluate the final condition that we may be skipping
                    if (condition) {
                        const { precedingStatements, result } = createOrExpression(context, conditionVariable, condition, conditionPrecedingStatements);
                        conditionPrecedingStatements = precedingStatements;
                        condition = result;
                        statements.push(...conditionPrecedingStatements, lua.createAssignmentStatement(conditionVariable, condition));
                    }
                    continue;
                }
            }
            // Transform the clause and append the final break statement if necessary
            const { statements: clauseStatements, hoistedStatements: clauseHoistedStatements, hoistedIdentifiers: clauseHoistedIdentifiers, } = (0, scope_1.separateHoistedStatements)(context, context.transformStatements(clause.statements));
            if (i === clauses.length - 1 && !containsBreakOrReturn(clause.statements)) {
                clauseStatements.push(lua.createBreakStatement());
            }
            hoistedStatements.push(...clauseHoistedStatements);
            hoistedIdentifiers.push(...clauseHoistedIdentifiers);
            // Remember that we transformed default clause so we don't duplicate hoisted statements later
            if (ts.isDefaultClause(clause)) {
                defaultTransformed = true;
            }
            // Push if statement for case
            statements.push(lua.createIfStatement(conditionVariable, lua.createBlock(clauseStatements)));
            // Clear condition for next clause
            condition = undefined;
            conditionPrecedingStatements = [];
        }
        // If no conditions above match, we need to create the final default case code-path,
        // as we only handle fallthrough into defaults in the previous if statement chain
        const start = clauses.findIndex(c => ts.isDefaultClause(c));
        if (start >= 0) {
            // Find the last clause that we can fallthrough to
            const end = clauses.findIndex((clause, index) => index >= start && containsBreakOrReturn(clause.statements));
            const { statements: defaultStatements, hoistedStatements: defaultHoistedStatements, hoistedIdentifiers: defaultHoistedIdentifiers, } = (0, scope_1.separateHoistedStatements)(context, context.transformStatements(clauses[start].statements));
            // Only push hoisted statements if this is the first time we're transforming the default clause
            if (!defaultTransformed) {
                hoistedStatements.push(...defaultHoistedStatements);
                hoistedIdentifiers.push(...defaultHoistedIdentifiers);
            }
            // Combine the fallthrough statements
            for (const clause of clauses.slice(start + 1, end >= 0 ? end + 1 : undefined)) {
                let statements = context.transformStatements(clause.statements);
                // Drop hoisted statements as they were already added when clauses were initially transformed above
                ({ statements } = (0, scope_1.separateHoistedStatements)(context, statements));
                defaultStatements.push(...statements);
            }
            // Add the default clause if it has any statements
            // The switch will always break on the final clause and skip execution if valid to do so
            if (defaultStatements.length) {
                statements.push(lua.createDoStatement(defaultStatements));
            }
        }
    }
    // Hoist the variable, function, and import statements to the top of the switch
    statements.unshift(...hoistedStatements);
    if (hoistedIdentifiers.length > 0) {
        statements.unshift(lua.createVariableDeclarationStatement(hoistedIdentifiers));
    }
    context.popScope();
    // Add the switch expression after hoisting
    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));
    // Wrap the statements in a repeat until true statement to facilitate dynamic break/returns
    return lua.createRepeatStatement(lua.createBlock(statements), lua.createBooleanLiteral(true));
};
exports.transformSwitchStatement = transformSwitchStatement;
//# sourceMappingURL=switch.js.map
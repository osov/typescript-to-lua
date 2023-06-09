"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformVoidExpression = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const expression_statement_1 = require("./expression-statement");
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void
const transformVoidExpression = (node, context) => {
    // If content is a literal it is safe to replace the entire expression with nil
    if (!ts.isLiteralExpression(node.expression)) {
        const statements = (0, expression_statement_1.wrapInStatement)(context.transformExpression(node.expression));
        if (statements)
            context.addPrecedingStatements(statements);
    }
    return lua.createNilLiteral();
};
exports.transformVoidExpression = transformVoidExpression;
//# sourceMappingURL=void.js.map
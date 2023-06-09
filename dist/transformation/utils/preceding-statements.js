"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformInPrecedingStatementScope = void 0;
function transformInPrecedingStatementScope(context, transformer) {
    context.pushPrecedingStatements();
    const statementOrStatements = transformer();
    const precedingStatements = context.popPrecedingStatements();
    return { precedingStatements, result: statementOrStatements };
}
exports.transformInPrecedingStatementScope = transformInPrecedingStatementScope;
//# sourceMappingURL=preceding-statements.js.map
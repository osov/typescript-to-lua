"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformConstructorDeclaration = exports.createConstructorName = exports.createPrototypeName = void 0;
const ts = require("typescript");
const lua = require("../../../../LuaAST");
const lua_ast_1 = require("../../../utils/lua-ast");
const scope_1 = require("../../../utils/scope");
const function_1 = require("../../function");
const identifier_1 = require("../../identifier");
const fields_1 = require("./fields");
function createPrototypeName(className) {
    return lua.createTableIndexExpression(lua.cloneIdentifier(className), lua.createStringLiteral("prototype"));
}
exports.createPrototypeName = createPrototypeName;
function createConstructorName(className) {
    return lua.createTableIndexExpression(createPrototypeName(className), lua.createStringLiteral("____constructor"));
}
exports.createConstructorName = createConstructorName;
function transformConstructorDeclaration(context, statement, className, instanceFields, classDeclaration) {
    // Don't transform methods without body (overload declarations)
    if (!statement.body) {
        return undefined;
    }
    // Transform body
    const scope = context.pushScope(scope_1.ScopeType.Function);
    const body = (0, function_1.transformFunctionBodyContent)(context, statement.body);
    const [params, dotsLiteral, restParamName] = (0, function_1.transformParameters)(context, statement.parameters, (0, lua_ast_1.createSelfIdentifier)());
    // Make sure default parameters are assigned before fields are initialized
    const bodyWithFieldInitializers = (0, function_1.transformFunctionBodyHeader)(context, scope, statement.parameters, restParamName);
    // Check for field declarations in constructor
    const constructorFieldsDeclarations = statement.parameters.filter(p => p.modifiers !== undefined);
    const classInstanceFields = (0, fields_1.transformClassInstanceFields)(context, instanceFields);
    // If there are field initializers and the first statement is a super call,
    // move super call between default assignments and initializers
    if ((constructorFieldsDeclarations.length > 0 || classInstanceFields.length > 0) &&
        statement.body &&
        statement.body.statements.length > 0) {
        const firstStatement = statement.body.statements[0];
        if (ts.isExpressionStatement(firstStatement) &&
            ts.isCallExpression(firstStatement.expression) &&
            firstStatement.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
            const superCall = body.shift();
            if (superCall) {
                bodyWithFieldInitializers.push(superCall);
            }
        }
    }
    // Add in instance field declarations
    for (const declaration of constructorFieldsDeclarations) {
        if (ts.isIdentifier(declaration.name)) {
            // self.declarationName = declarationName
            const assignment = lua.createAssignmentStatement(lua.createTableIndexExpression((0, lua_ast_1.createSelfIdentifier)(), lua.createStringLiteral(declaration.name.text)), (0, identifier_1.transformIdentifier)(context, declaration.name));
            bodyWithFieldInitializers.push(assignment);
        }
        // else { TypeScript error: A parameter property may not be declared using a binding pattern }
    }
    bodyWithFieldInitializers.push(...classInstanceFields);
    bodyWithFieldInitializers.push(...body);
    const block = lua.createBlock(bodyWithFieldInitializers);
    const constructorWasGenerated = statement.pos === -1;
    context.popScope();
    return lua.createAssignmentStatement(createConstructorName(className), lua.createFunctionExpression(block, params, dotsLiteral, lua.NodeFlags.Declaration), constructorWasGenerated ? classDeclaration : statement);
}
exports.transformConstructorDeclaration = transformConstructorDeclaration;
//# sourceMappingURL=constructor.js.map
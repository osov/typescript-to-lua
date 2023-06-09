"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSuperExpression = exports.transformClassAsExpression = exports.transformThisExpression = exports.transformClassDeclaration = void 0;
const ts = require("typescript");
const lua = require("../../../LuaAST");
const export_1 = require("../../utils/export");
const lua_ast_1 = require("../../utils/lua-ast");
const safe_names_1 = require("../../utils/safe-names");
const identifier_1 = require("../identifier");
const decorators_1 = require("./decorators");
const accessors_1 = require("./members/accessors");
const constructor_1 = require("./members/constructor");
const fields_1 = require("./members/fields");
const method_1 = require("./members/method");
const utils_1 = require("./utils");
const setup_1 = require("./setup");
const CompilerOptions_1 = require("../../../CompilerOptions");
const preceding_statements_1 = require("../../utils/preceding-statements");
const transformClassDeclaration = (declaration, context) => {
    // If declaration is a default export, transform to export variable assignment instead
    if ((0, export_1.hasDefaultExportModifier)(declaration)) {
        // Class declaration including assignment to ____exports.default are in preceding statements
        const { precedingStatements } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => {
            transformClassAsExpression(declaration, context);
            return [];
        });
        return precedingStatements;
    }
    const { statements } = transformClassLikeDeclaration(declaration, context);
    return statements;
};
exports.transformClassDeclaration = transformClassDeclaration;
const transformThisExpression = node => (0, lua_ast_1.createSelfIdentifier)(node);
exports.transformThisExpression = transformThisExpression;
function transformClassAsExpression(expression, context) {
    const { statements, name } = transformClassLikeDeclaration(expression, context);
    context.addPrecedingStatements(statements);
    return name;
}
exports.transformClassAsExpression = transformClassAsExpression;
function transformClassLikeDeclaration(classDeclaration, context, nameOverride) {
    var _a, _b;
    let className;
    if (nameOverride !== undefined) {
        className = nameOverride;
    }
    else if (classDeclaration.name !== undefined) {
        className = (0, identifier_1.transformIdentifier)(context, classDeclaration.name);
    }
    else {
        className = lua.createIdentifier(context.createTempName("class"), classDeclaration);
    }
    // Get type that is extended
    const extendedTypeNode = (0, utils_1.getExtendedNode)(classDeclaration);
    const extendedType = (0, utils_1.getExtendedType)(context, classDeclaration);
    context.classSuperInfos.push({ className, extendedTypeNode });
    // Get all properties with value
    const properties = classDeclaration.members.filter(ts.isPropertyDeclaration).filter(member => member.initializer);
    // Divide properties into static and non-static
    const instanceFields = properties.filter(prop => !(0, utils_1.isStaticNode)(prop));
    const result = [];
    let localClassName;
    if ((0, safe_names_1.isUnsafeName)(className.text, context.options)) {
        localClassName = lua.createIdentifier((0, safe_names_1.createSafeName)(className.text), undefined, className.symbolId, className.text);
        lua.setNodePosition(localClassName, className);
    }
    else {
        localClassName = className;
    }
    result.push(...(0, setup_1.createClassSetup)(context, classDeclaration, className, localClassName, extendedType));
    // Find first constructor with body
    const constructor = classDeclaration.members.find((n) => ts.isConstructorDeclaration(n) && n.body !== undefined);
    if (constructor) {
        // Add constructor plus initialization of instance fields
        const constructorResult = (0, constructor_1.transformConstructorDeclaration)(context, constructor, localClassName, instanceFields, classDeclaration);
        if (constructorResult)
            result.push(constructorResult);
    }
    else if (!extendedType) {
        // Generate a constructor if none was defined in a base class
        const constructorResult = (0, constructor_1.transformConstructorDeclaration)(context, ts.factory.createConstructorDeclaration([], [], ts.factory.createBlock([], true)), localClassName, instanceFields, classDeclaration);
        if (constructorResult)
            result.push(constructorResult);
    }
    else if (instanceFields.length > 0) {
        // Generate a constructor if none was defined in a class with instance fields that need initialization
        // localClassName.prototype.____constructor = function(self, ...)
        //     baseClassName.prototype.____constructor(self, ...)  // or unpack(arg) for Lua 5.0
        //     ...
        const constructorBody = (0, fields_1.transformClassInstanceFields)(context, instanceFields);
        const argsExpression = context.luaTarget === CompilerOptions_1.LuaTarget.Lua50
            ? lua.createCallExpression(lua.createIdentifier("unpack"), [lua.createArgLiteral()])
            : lua.createDotsLiteral();
        const superCall = lua.createExpressionStatement(lua.createCallExpression(lua.createTableIndexExpression(context.transformExpression(ts.factory.createSuper()), lua.createStringLiteral("____constructor")), [(0, lua_ast_1.createSelfIdentifier)(), argsExpression]));
        constructorBody.unshift(superCall);
        const constructorFunction = lua.createFunctionExpression(lua.createBlock(constructorBody), [(0, lua_ast_1.createSelfIdentifier)()], lua.createDotsLiteral(), lua.NodeFlags.Declaration);
        result.push(lua.createAssignmentStatement((0, constructor_1.createConstructorName)(localClassName), constructorFunction, classDeclaration));
    }
    // Transform accessors
    for (const member of classDeclaration.members) {
        if (!ts.isAccessor(member))
            continue;
        const accessors = context.resolver.getAllAccessorDeclarations(member);
        if (accessors.firstAccessor !== member)
            continue;
        const accessorsResult = (0, accessors_1.transformAccessorDeclarations)(context, accessors, localClassName);
        if (accessorsResult) {
            result.push(accessorsResult);
        }
    }
    const decorationStatements = [];
    for (const member of classDeclaration.members) {
        if (ts.isAccessor(member)) {
            const expression = (0, fields_1.createPropertyDecoratingExpression)(context, member, localClassName);
            if (expression)
                decorationStatements.push(lua.createExpressionStatement(expression));
        }
        else if (ts.isMethodDeclaration(member)) {
            const statement = (0, method_1.transformMethodDeclaration)(context, member, localClassName);
            if (statement)
                result.push(statement);
            if (member.body) {
                const statement = (0, method_1.createMethodDecoratingExpression)(context, member, localClassName);
                if (statement)
                    decorationStatements.push(statement);
            }
        }
        else if (ts.isPropertyDeclaration(member)) {
            if ((0, utils_1.isStaticNode)(member)) {
                const statement = (0, fields_1.transformStaticPropertyDeclaration)(context, member, localClassName);
                if (statement)
                    decorationStatements.push(statement);
            }
            const expression = (0, fields_1.createPropertyDecoratingExpression)(context, member, localClassName);
            if (expression)
                decorationStatements.push(lua.createExpressionStatement(expression));
        }
    }
    result.push(...decorationStatements);
    // Decorate the class
    if (ts.canHaveDecorators(classDeclaration) && ts.getDecorators(classDeclaration)) {
        const decoratingExpression = (0, decorators_1.createDecoratingExpression)(context, classDeclaration.kind, (_b = (_a = ts.getDecorators(classDeclaration)) === null || _a === void 0 ? void 0 : _a.map(d => (0, decorators_1.transformDecoratorExpression)(context, d))) !== null && _b !== void 0 ? _b : [], localClassName);
        const decoratingStatement = lua.createAssignmentStatement(localClassName, decoratingExpression);
        result.push(decoratingStatement);
        if ((0, export_1.hasExportModifier)(classDeclaration)) {
            const exportExpression = (0, export_1.hasDefaultExportModifier)(classDeclaration)
                ? (0, export_1.createDefaultExportExpression)(classDeclaration)
                : (0, export_1.createExportedIdentifier)(context, className);
            const classAssignment = lua.createAssignmentStatement(exportExpression, localClassName);
            result.push(classAssignment);
        }
    }
    context.classSuperInfos.pop();
    return { statements: result, name: className };
}
const transformSuperExpression = (expression, context) => {
    const superInfos = context.classSuperInfos;
    const superInfo = superInfos[superInfos.length - 1];
    if (!superInfo)
        return lua.createAnonymousIdentifier(expression);
    const { className, extendedTypeNode } = superInfo;
    // Using `super` without extended type node is a TypeScript error
    const extendsExpression = extendedTypeNode === null || extendedTypeNode === void 0 ? void 0 : extendedTypeNode.expression;
    let baseClassName;
    if (extendsExpression && ts.isIdentifier(extendsExpression)) {
        const symbol = context.checker.getSymbolAtLocation(extendsExpression);
        if (symbol && !(0, export_1.isSymbolExported)(context, symbol)) {
            // Use "baseClassName" if base is a simple identifier
            baseClassName = (0, identifier_1.transformIdentifier)(context, extendsExpression);
        }
    }
    if (!baseClassName) {
        // Use "className.____super" if the base is not a simple identifier
        baseClassName = lua.createTableIndexExpression(className, lua.createStringLiteral("____super"), expression);
    }
    return lua.createTableIndexExpression(baseClassName, lua.createStringLiteral("prototype"));
};
exports.transformSuperExpression = transformSuperExpression;
//# sourceMappingURL=index.js.map
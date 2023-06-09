"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformYieldExpression = exports.transformFunctionDeclaration = exports.transformFunctionLikeDeclaration = exports.transformFunctionToExpression = exports.transformParameters = exports.transformFunctionBody = exports.transformFunctionBodyHeader = exports.transformFunctionBodyContent = exports.isFunctionTypeWithProperties = exports.createCallableTable = void 0;
const ts = require("typescript");
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const utils_1 = require("../../utils");
const export_1 = require("../utils/export");
const function_context_1 = require("../utils/function-context");
const language_extensions_1 = require("../utils/language-extensions");
const lua_ast_1 = require("../utils/lua-ast");
const lualib_1 = require("../utils/lualib");
const preceding_statements_1 = require("../utils/preceding-statements");
const scope_1 = require("../utils/scope");
const typescript_1 = require("../utils/typescript");
const async_await_1 = require("./async-await");
const identifier_1 = require("./identifier");
const return_1 = require("./return");
const variable_declaration_1 = require("./variable-declaration");
function transformParameterDefaultValueDeclaration(context, parameterName, value, tsOriginal) {
    const parameterValue = value ? context.transformExpression(value) : undefined;
    const assignment = lua.createAssignmentStatement(parameterName, parameterValue);
    const nilCondition = lua.createBinaryExpression(parameterName, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator);
    const ifBlock = lua.createBlock([assignment]);
    return lua.createIfStatement(nilCondition, ifBlock, undefined, tsOriginal);
}
function isRestParameterReferenced(identifier, scope) {
    if (!identifier.symbolId) {
        return true;
    }
    if (scope.referencedSymbols === undefined) {
        return false;
    }
    const references = scope.referencedSymbols.get(identifier.symbolId);
    return references !== undefined && references.length > 0;
}
function createCallableTable(functionExpression) {
    var _a;
    // __call metamethod receives the table as the first argument, so we need to add a dummy parameter
    if (lua.isFunctionExpression(functionExpression)) {
        (_a = functionExpression.params) === null || _a === void 0 ? void 0 : _a.unshift(lua.createAnonymousIdentifier());
    }
    else {
        // functionExpression may have been replaced (lib functions, etc...),
        // so we create a forwarding function to eat the extra argument
        functionExpression = lua.createFunctionExpression(lua.createBlock([
            lua.createReturnStatement([lua.createCallExpression(functionExpression, [lua.createDotsLiteral()])]),
        ]), [lua.createAnonymousIdentifier()], lua.createDotsLiteral(), lua.NodeFlags.Inline);
    }
    return lua.createCallExpression(lua.createIdentifier("setmetatable"), [
        lua.createTableExpression(),
        lua.createTableExpression([
            lua.createTableFieldExpression(functionExpression, lua.createStringLiteral("__call")),
        ]),
    ]);
}
exports.createCallableTable = createCallableTable;
function isFunctionTypeWithProperties(context, functionType) {
    if (functionType.isUnion()) {
        return functionType.types.some(t => isFunctionTypeWithProperties(context, t));
    }
    else {
        return ((0, typescript_1.isFunctionType)(functionType) &&
            functionType.getProperties().length > 0 &&
            (0, language_extensions_1.getExtensionKindForType)(context, functionType) === undefined // ignore TSTL extension functions like $range
        );
    }
}
exports.isFunctionTypeWithProperties = isFunctionTypeWithProperties;
function transformFunctionBodyContent(context, body) {
    if (!ts.isBlock(body)) {
        const { precedingStatements, result: returnStatement } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, return_1.transformExpressionBodyToReturnStatement)(context, body));
        return [...precedingStatements, returnStatement];
    }
    const bodyStatements = (0, scope_1.performHoisting)(context, context.transformStatements(body.statements));
    return bodyStatements;
}
exports.transformFunctionBodyContent = transformFunctionBodyContent;
function transformFunctionBodyHeader(context, bodyScope, parameters, spreadIdentifier) {
    const headerStatements = [];
    // Add default parameters and object binding patterns
    const bindingPatternDeclarations = [];
    let bindPatternIndex = 0;
    for (const declaration of parameters) {
        if (ts.isObjectBindingPattern(declaration.name) || ts.isArrayBindingPattern(declaration.name)) {
            const identifier = lua.createIdentifier(`____bindingPattern${bindPatternIndex++}`);
            if (declaration.initializer !== undefined) {
                // Default binding parameter
                headerStatements.push(transformParameterDefaultValueDeclaration(context, identifier, declaration.initializer));
            }
            // Binding pattern
            const name = declaration.name;
            const { precedingStatements, result: bindings } = (0, preceding_statements_1.transformInPrecedingStatementScope)(context, () => (0, variable_declaration_1.transformBindingPattern)(context, name, identifier));
            bindingPatternDeclarations.push(...precedingStatements, ...bindings);
        }
        else if (declaration.initializer !== undefined) {
            // Default parameter
            headerStatements.push(transformParameterDefaultValueDeclaration(context, (0, identifier_1.transformIdentifier)(context, declaration.name), declaration.initializer));
        }
    }
    // Push spread operator here
    if (spreadIdentifier && isRestParameterReferenced(spreadIdentifier, bodyScope)) {
        const spreadTable = context.luaTarget === CompilerOptions_1.LuaTarget.Lua50 ? lua.createArgLiteral() : (0, lua_ast_1.wrapInTable)(lua.createDotsLiteral());
        headerStatements.push(lua.createVariableDeclarationStatement(spreadIdentifier, spreadTable));
    }
    // Binding pattern statements need to be after spread table is declared
    headerStatements.push(...bindingPatternDeclarations);
    return headerStatements;
}
exports.transformFunctionBodyHeader = transformFunctionBodyHeader;
function transformFunctionBody(context, parameters, body, spreadIdentifier, node) {
    const scope = context.pushScope(scope_1.ScopeType.Function);
    scope.node = node;
    let bodyStatements = transformFunctionBodyContent(context, body);
    if (node && (0, async_await_1.isAsyncFunction)(node)) {
        bodyStatements = [lua.createReturnStatement([(0, async_await_1.wrapInAsyncAwaiter)(context, bodyStatements)])];
    }
    const headerStatements = transformFunctionBodyHeader(context, scope, parameters, spreadIdentifier);
    context.popScope();
    return [[...headerStatements, ...bodyStatements], scope];
}
exports.transformFunctionBody = transformFunctionBody;
function transformParameters(context, parameters, functionContext) {
    // Build parameter string
    const paramNames = [];
    if (functionContext) {
        paramNames.push(functionContext);
    }
    let restParamName;
    let dotsLiteral;
    let identifierIndex = 0;
    // Only push parameter name to paramName array if it isn't a spread parameter
    for (const param of parameters) {
        if (ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
            continue;
        }
        // Binding patterns become ____bindingPattern0, ____bindingPattern1, etc as function parameters
        // See transformFunctionBody for how these values are destructured
        const paramName = ts.isObjectBindingPattern(param.name) || ts.isArrayBindingPattern(param.name)
            ? lua.createIdentifier(`____bindingPattern${identifierIndex++}`)
            : (0, identifier_1.transformIdentifier)(context, param.name);
        // This parameter is a spread parameter (...param)
        if (!param.dotDotDotToken) {
            paramNames.push(paramName);
        }
        else {
            restParamName = paramName;
            // Push the spread operator into the paramNames array
            dotsLiteral = lua.createDotsLiteral();
        }
    }
    return [paramNames, dotsLiteral, restParamName];
}
exports.transformParameters = transformParameters;
function transformFunctionToExpression(context, node) {
    (0, utils_1.assert)(node.body);
    const type = context.checker.getTypeAtLocation(node);
    let functionContext;
    if ((0, function_context_1.getFunctionContextType)(context, type) !== function_context_1.ContextType.Void) {
        if (ts.isArrowFunction(node)) {
            // dummy context for arrow functions with parameters
            if (node.parameters.length > 0) {
                functionContext = lua.createAnonymousIdentifier();
            }
        }
        else {
            // self context
            functionContext = (0, lua_ast_1.createSelfIdentifier)();
        }
    }
    let flags = lua.NodeFlags.None;
    if (!ts.isBlock(node.body))
        flags |= lua.NodeFlags.Inline;
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        flags |= lua.NodeFlags.Declaration;
    }
    const [paramNames, dotsLiteral, spreadIdentifier] = transformParameters(context, node.parameters, functionContext);
    const [transformedBody, functionScope] = transformFunctionBody(context, node.parameters, node.body, spreadIdentifier, node);
    const functionExpression = lua.createFunctionExpression(lua.createBlock(transformedBody), paramNames, dotsLiteral, flags, node);
    return [
        node.asteriskToken
            ? (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.Generator, undefined, functionExpression)
            : functionExpression,
        functionScope,
    ];
}
exports.transformFunctionToExpression = transformFunctionToExpression;
function transformFunctionLikeDeclaration(node, context) {
    if (node.body === undefined) {
        // This code can be reached only from object methods, which is TypeScript error
        return lua.createNilLiteral();
    }
    const [functionExpression, functionScope] = transformFunctionToExpression(context, node);
    const isNamedFunctionExpression = ts.isFunctionExpression(node) && node.name;
    // Handle named function expressions which reference themselves
    if (isNamedFunctionExpression && functionScope.referencedSymbols) {
        const symbol = context.checker.getSymbolAtLocation(node.name);
        if (symbol) {
            // TODO: Not using symbol ids because of https://github.com/microsoft/TypeScript/issues/37131
            const isReferenced = [...functionScope.referencedSymbols].some(([, nodes]) => nodes.some(n => { var _a; return ((_a = context.checker.getSymbolAtLocation(n)) === null || _a === void 0 ? void 0 : _a.valueDeclaration) === symbol.valueDeclaration; }));
            // Only handle if the name is actually referenced inside the function
            if (isReferenced) {
                const nameIdentifier = (0, identifier_1.transformIdentifier)(context, node.name);
                if (isFunctionTypeWithProperties(context, context.checker.getTypeAtLocation(node))) {
                    context.addPrecedingStatements([
                        lua.createVariableDeclarationStatement(nameIdentifier),
                        lua.createAssignmentStatement(nameIdentifier, createCallableTable(functionExpression)),
                    ]);
                }
                else {
                    context.addPrecedingStatements(lua.createVariableDeclarationStatement(nameIdentifier, functionExpression));
                }
                return lua.cloneIdentifier(nameIdentifier);
            }
        }
    }
    return isNamedFunctionExpression && isFunctionTypeWithProperties(context, context.checker.getTypeAtLocation(node))
        ? createCallableTable(functionExpression)
        : functionExpression;
}
exports.transformFunctionLikeDeclaration = transformFunctionLikeDeclaration;
const transformFunctionDeclaration = (node, context) => {
    var _a;
    // Don't transform functions without body (overload declarations)
    if (node.body === undefined) {
        return undefined;
    }
    if ((0, export_1.hasDefaultExportModifier)(node)) {
        return lua.createAssignmentStatement(lua.createTableIndexExpression((0, lua_ast_1.createExportsIdentifier)(), (0, export_1.createDefaultExportStringLiteral)(node)), transformFunctionLikeDeclaration(node, context));
    }
    const [functionExpression, functionScope] = transformFunctionToExpression(context, node);
    // Name being undefined without default export is a TypeScript error
    const name = node.name ? (0, identifier_1.transformIdentifier)(context, node.name) : lua.createAnonymousIdentifier();
    // Remember symbols referenced in this function for hoisting later
    if (name.symbolId !== undefined) {
        const scope = (0, scope_1.peekScope)(context);
        if (!scope.functionDefinitions) {
            scope.functionDefinitions = new Map();
        }
        const functionInfo = { referencedSymbols: (_a = functionScope.referencedSymbols) !== null && _a !== void 0 ? _a : new Map() };
        scope.functionDefinitions.set(name.symbolId, functionInfo);
    }
    // Wrap functions with properties into a callable table
    const wrappedFunction = node.name && isFunctionTypeWithProperties(context, context.checker.getTypeAtLocation(node.name))
        ? createCallableTable(functionExpression)
        : functionExpression;
    return (0, lua_ast_1.createLocalOrExportedOrGlobalDeclaration)(context, name, wrappedFunction, node);
};
exports.transformFunctionDeclaration = transformFunctionDeclaration;
const transformYieldExpression = (expression, context) => {
    const parameters = expression.expression ? [context.transformExpression(expression.expression)] : [];
    return expression.asteriskToken
        ? (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.DelegatedYield, expression, ...parameters)
        : lua.createCallExpression(lua.createTableIndexExpression(lua.createIdentifier("coroutine"), lua.createStringLiteral("yield")), parameters, expression);
};
exports.transformYieldExpression = transformYieldExpression;
//# sourceMappingURL=function.js.map
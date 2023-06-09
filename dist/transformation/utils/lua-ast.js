"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNaN = exports.createLocalOrExportedOrGlobalDeclaration = exports.createHoistableVariableDeclarationStatement = exports.wrapInToStringForConcat = exports.wrapInTable = exports.isUnpackCall = exports.createUnpackCall = exports.getNumberLiteralValue = exports.addToNumericExpression = exports.createExportsIdentifier = exports.createSelfIdentifier = exports.unwrapVisitorResult = void 0;
const ts = require("typescript");
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const utils_1 = require("../../utils");
const export_1 = require("./export");
const scope_1 = require("./scope");
const lualib_1 = require("./lualib");
const LuaLib_1 = require("../../LuaLib");
function unwrapVisitorResult(result) {
    return result === undefined ? [] : (0, utils_1.castArray)(result);
}
exports.unwrapVisitorResult = unwrapVisitorResult;
function createSelfIdentifier(tsOriginal) {
    return lua.createIdentifier("self", tsOriginal, undefined, "this");
}
exports.createSelfIdentifier = createSelfIdentifier;
function createExportsIdentifier() {
    return lua.createIdentifier("____exports");
}
exports.createExportsIdentifier = createExportsIdentifier;
function addToNumericExpression(expression, change) {
    if (change === 0)
        return expression;
    const literalValue = getNumberLiteralValue(expression);
    if (literalValue !== undefined) {
        const newNode = lua.createNumericLiteral(literalValue + change);
        lua.setNodePosition(newNode, expression);
        return newNode;
    }
    if (lua.isBinaryExpression(expression)) {
        if (lua.isNumericLiteral(expression.right) &&
            ((expression.operator === lua.SyntaxKind.SubtractionOperator && expression.right.value === change) ||
                (expression.operator === lua.SyntaxKind.AdditionOperator && expression.right.value === -change))) {
            return expression.left;
        }
    }
    return change > 0
        ? lua.createBinaryExpression(expression, lua.createNumericLiteral(change), lua.SyntaxKind.AdditionOperator)
        : lua.createBinaryExpression(expression, lua.createNumericLiteral(-change), lua.SyntaxKind.SubtractionOperator);
}
exports.addToNumericExpression = addToNumericExpression;
function getNumberLiteralValue(expression) {
    if (!expression)
        return undefined;
    if (lua.isNumericLiteral(expression))
        return expression.value;
    if (lua.isUnaryExpression(expression) &&
        expression.operator === lua.SyntaxKind.NegationOperator &&
        lua.isNumericLiteral(expression.operand)) {
        return -expression.operand.value;
    }
    return undefined;
}
exports.getNumberLiteralValue = getNumberLiteralValue;
function createUnpackCall(context, expression, tsOriginal) {
    if (context.luaTarget === CompilerOptions_1.LuaTarget.Universal) {
        return (0, lualib_1.transformLuaLibFunction)(context, LuaLib_1.LuaLibFeature.Unpack, tsOriginal, expression);
    }
    const unpack = context.luaTarget === CompilerOptions_1.LuaTarget.Lua50 ||
        context.luaTarget === CompilerOptions_1.LuaTarget.Lua51 ||
        context.luaTarget === CompilerOptions_1.LuaTarget.LuaJIT
        ? lua.createIdentifier("unpack")
        : lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("unpack"));
    return lua.setNodeFlags(lua.createCallExpression(unpack, [expression], tsOriginal), lua.NodeFlags.TableUnpackCall);
}
exports.createUnpackCall = createUnpackCall;
function isUnpackCall(node) {
    return lua.isCallExpression(node) && (node.flags & lua.NodeFlags.TableUnpackCall) !== 0;
}
exports.isUnpackCall = isUnpackCall;
function wrapInTable(...expressions) {
    const fields = expressions.map(e => lua.createTableFieldExpression(e));
    return lua.createTableExpression(fields);
}
exports.wrapInTable = wrapInTable;
function wrapInToStringForConcat(expression) {
    if (lua.isStringLiteral(expression) ||
        lua.isNumericLiteral(expression) ||
        (lua.isBinaryExpression(expression) && expression.operator === lua.SyntaxKind.ConcatOperator)) {
        return expression;
    }
    return lua.createCallExpression(lua.createIdentifier("tostring"), [expression]);
}
exports.wrapInToStringForConcat = wrapInToStringForConcat;
function createHoistableVariableDeclarationStatement(context, identifier, initializer, tsOriginal) {
    const declaration = lua.createVariableDeclarationStatement(identifier, initializer, tsOriginal);
    if (identifier.symbolId !== undefined) {
        const scope = (0, scope_1.peekScope)(context);
        (0, utils_1.assert)(scope.type !== scope_1.ScopeType.Switch);
        (0, scope_1.addScopeVariableDeclaration)(scope, declaration);
    }
    return declaration;
}
exports.createHoistableVariableDeclarationStatement = createHoistableVariableDeclarationStatement;
function hasMultipleReferences(scope, identifiers) {
    const scopeSymbols = scope.referencedSymbols;
    if (!scopeSymbols) {
        return false;
    }
    const referenceLists = (0, utils_1.castArray)(identifiers).map(i => i.symbolId && scopeSymbols.get(i.symbolId));
    return referenceLists.some(symbolRefs => symbolRefs && symbolRefs.length > 1);
}
function createLocalOrExportedOrGlobalDeclaration(context, lhs, rhs, tsOriginal, overrideExportScope) {
    let declaration;
    let assignment;
    const noImplicitGlobalVariables = context.options.noImplicitGlobalVariables === true;
    const isFunctionDeclaration = tsOriginal !== undefined && ts.isFunctionDeclaration(tsOriginal);
    const identifiers = (0, utils_1.castArray)(lhs);
    if (identifiers.length === 0) {
        return [];
    }
    const exportScope = overrideExportScope !== null && overrideExportScope !== void 0 ? overrideExportScope : (0, export_1.getIdentifierExportScope)(context, identifiers[0]);
    if (exportScope) {
        // exported
        if (!rhs) {
            return [];
        }
        else {
            assignment = lua.createAssignmentStatement(identifiers.map(identifier => (0, export_1.createExportedIdentifier)(context, identifier, exportScope)), rhs, tsOriginal);
        }
    }
    else {
        const scope = (0, scope_1.peekScope)(context);
        const isTopLevelVariable = scope.type === scope_1.ScopeType.File;
        if (context.isModule || !isTopLevelVariable || noImplicitGlobalVariables) {
            const isLuaFunctionExpression = rhs && !Array.isArray(rhs) && lua.isFunctionExpression(rhs);
            const isSafeRecursiveFunctionDeclaration = isFunctionDeclaration && isLuaFunctionExpression;
            if (!isSafeRecursiveFunctionDeclaration && hasMultipleReferences(scope, lhs)) {
                // Split declaration and assignment of identifiers that reference themselves in their declaration.
                // Put declaration above preceding statements in case the identifier is referenced in those.
                const precedingDeclaration = lua.createVariableDeclarationStatement(lhs, undefined, tsOriginal);
                context.prependPrecedingStatements(precedingDeclaration);
                if (rhs) {
                    assignment = lua.createAssignmentStatement(lhs, rhs, tsOriginal);
                }
                // Remember local variable declarations for hoisting later
                (0, scope_1.addScopeVariableDeclaration)(scope, precedingDeclaration);
            }
            else {
                declaration = lua.createVariableDeclarationStatement(lhs, rhs, tsOriginal);
                if (!isFunctionDeclaration) {
                    // Remember local variable declarations for hoisting later
                    (0, scope_1.addScopeVariableDeclaration)(scope, declaration);
                }
            }
        }
        else if (rhs) {
            // global
            assignment = lua.createAssignmentStatement(lhs, rhs, tsOriginal);
        }
        else {
            return [];
        }
    }
    if (isFunctionDeclaration) {
        // Remember function definitions for hoisting later
        const functionSymbolId = lhs.symbolId;
        const scope = (0, scope_1.peekScope)(context);
        if (functionSymbolId && scope.functionDefinitions) {
            const definitions = scope.functionDefinitions.get(functionSymbolId);
            if (definitions) {
                definitions.definition = declaration !== null && declaration !== void 0 ? declaration : assignment;
            }
        }
    }
    setJSDocComments(context, tsOriginal, declaration, assignment);
    if (declaration && assignment) {
        return [declaration, assignment];
    }
    else if (declaration) {
        return [declaration];
    }
    else if (assignment) {
        return [assignment];
    }
    else {
        return [];
    }
}
exports.createLocalOrExportedOrGlobalDeclaration = createLocalOrExportedOrGlobalDeclaration;
/**
 * Apply JSDoc comments to the newly-created Lua statement, if present.
 * https://stackoverflow.com/questions/47429792/is-it-possible-to-get-comments-as-nodes-in-the-ast-using-the-typescript-compiler
 */
function setJSDocComments(context, tsOriginal, declaration, assignment) {
    // Respect the vanilla TypeScript option of "removeComments":
    // https://www.typescriptlang.org/tsconfig#removeComments
    if (context.options.removeComments) {
        return;
    }
    const docCommentArray = getJSDocCommentFromTSNode(context, tsOriginal);
    if (docCommentArray === undefined) {
        return;
    }
    if (declaration && assignment) {
        declaration.leadingComments = docCommentArray;
    }
    else if (declaration) {
        declaration.leadingComments = docCommentArray;
    }
    else if (assignment) {
        assignment.leadingComments = docCommentArray;
    }
}
function getJSDocCommentFromTSNode(context, tsOriginal) {
    if (tsOriginal === undefined) {
        return undefined;
    }
    // The "name" property is only on a subset of node types; we want to be permissive and get the
    // comments from as many nodes as possible.
    const node = tsOriginal;
    if (node.name === undefined) {
        return undefined;
    }
    const symbol = context.checker.getSymbolAtLocation(node.name);
    if (symbol === undefined) {
        return undefined;
    }
    // The TypeScript compiler separates JSDoc comments into the "documentation comment" and the
    // "tags". The former is conventionally at the top of the comment, and the bottom is
    // conventionally at the bottom. We need to get both from the TypeScript API and then combine
    // them into one block of text.
    const docCommentArray = symbol.getDocumentationComment(context.checker);
    const docCommentText = ts.displayPartsToString(docCommentArray).trim();
    const jsDocTagInfoArray = symbol.getJsDocTags(context.checker);
    const jsDocTagsTextLines = jsDocTagInfoArray.map(jsDocTagInfo => {
        let text = "@" + jsDocTagInfo.name;
        if (jsDocTagInfo.text !== undefined) {
            const tagDescriptionTextArray = jsDocTagInfo.text
                .filter(symbolDisplayPart => symbolDisplayPart.text.trim() !== "")
                .map(symbolDisplayPart => symbolDisplayPart.text.trim());
            const tagDescriptionText = tagDescriptionTextArray.join(" ");
            text += " " + tagDescriptionText;
        }
        return text;
    });
    const jsDocTagsText = jsDocTagsTextLines.join("\n");
    const combined = (docCommentText + "\n\n" + jsDocTagsText).trim();
    if (combined === "") {
        return undefined;
    }
    // By default, TSTL will display comments immediately next to the "--" characters. We can make
    // the comments look better if we separate them by a space (similar to what Prettier does in
    // JavaScript/TypeScript).
    const linesWithoutSpace = combined.split("\n");
    const lines = linesWithoutSpace.map(line => ` ${line}`);
    // We want to JSDoc comments to map on to LDoc comments:
    // https://stevedonovan.github.io/ldoc/manual/doc.md.html
    // LDoc comments require that the first line starts with three hyphens.
    // Thus, need to add a hyphen to the first line.
    if (lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.startsWith(" @")) {
            lines.unshift("-");
        }
        else {
            lines.shift();
            lines.unshift("-" + firstLine);
        }
        return lines;
    }
}
const createNaN = (tsOriginal) => lua.createBinaryExpression(lua.createNumericLiteral(0), lua.createNumericLiteral(0), lua.SyntaxKind.DivisionOperator, tsOriginal);
exports.createNaN = createNaN;
//# sourceMappingURL=lua-ast.js.map
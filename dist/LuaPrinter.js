"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LuaPrinter = exports.createPrinter = exports.tstlHeader = exports.escapeString = void 0;
const path = require("path");
const source_map_1 = require("source-map");
const CompilerOptions_1 = require("./CompilerOptions");
const lua = require("./LuaAST");
const LuaLib_1 = require("./LuaLib");
const safe_names_1 = require("./transformation/utils/safe-names");
const transpilation_1 = require("./transpilation");
const utils_1 = require("./utils");
// https://www.lua.org/pil/2.4.html
// https://www.ecma-international.org/ecma-262/10.0/index.html#table-34
const escapeStringRegExp = /[\b\f\n\r\t\v\\"\0]/g;
const escapeStringMap = {
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
    "\v": "\\v",
    "\\": "\\\\",
    '"': '\\"',
    "\0": "\\0",
};
const escapeString = (value) => `"${value.replace(escapeStringRegExp, char => escapeStringMap[char])}"`;
exports.escapeString = escapeString;
exports.tstlHeader = "--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]\n";
/**
 * Checks that a name is valid for use in lua function declaration syntax:
 *
 * `foo.bar` => passes (`function foo.bar()` is valid)
 * `getFoo().bar` => fails (`function getFoo().bar()` would be illegal)
 */
const isValidLuaFunctionDeclarationName = (str, options) => ((0, safe_names_1.shouldAllowUnicode)(options) ? /^[a-zA-Z0-9_\u00FF-\uFFFD.]+$/ : /^[a-zA-Z0-9_.]+$/).test(str);
/**
 * Returns true if expression contains no function calls.
 */
function isSimpleExpression(expression) {
    switch (expression.kind) {
        case lua.SyntaxKind.CallExpression:
        case lua.SyntaxKind.MethodCallExpression:
        case lua.SyntaxKind.FunctionExpression:
            return false;
        case lua.SyntaxKind.TableExpression:
            const tableExpression = expression;
            return tableExpression.fields.every(e => isSimpleExpression(e));
        case lua.SyntaxKind.TableFieldExpression:
            const fieldExpression = expression;
            return ((!fieldExpression.key || isSimpleExpression(fieldExpression.key)) &&
                isSimpleExpression(fieldExpression.value));
        case lua.SyntaxKind.TableIndexExpression:
            const indexExpression = expression;
            return isSimpleExpression(indexExpression.table) && isSimpleExpression(indexExpression.index);
        case lua.SyntaxKind.UnaryExpression:
            return isSimpleExpression(expression.operand);
        case lua.SyntaxKind.BinaryExpression:
            const binaryExpression = expression;
            return isSimpleExpression(binaryExpression.left) && isSimpleExpression(binaryExpression.right);
    }
    return true;
}
function createPrinter(printers) {
    if (printers.length === 0) {
        return (program, emitHost, fileName, file) => new LuaPrinter(emitHost, program, fileName).print(file);
    }
    else if (printers.length === 1) {
        return printers[0];
    }
    else {
        throw new Error("Only one plugin can specify 'printer'");
    }
}
exports.createPrinter = createPrinter;
class LuaPrinter {
    constructor(emitHost, program, sourceFile) {
        this.emitHost = emitHost;
        this.program = program;
        this.sourceFile = sourceFile;
        this.currentIndent = "";
        this.options = program.getCompilerOptions();
        this.luaFile = (0, utils_1.normalizeSlashes)((0, transpilation_1.getEmitPath)(this.sourceFile, this.program));
        // Source nodes contain relative path from mapped lua file to original TS source file
        this.relativeSourcePath = (0, utils_1.normalizeSlashes)(path.relative(path.dirname(this.luaFile), this.sourceFile));
    }
    print(file) {
        // Add traceback lualib if sourcemap traceback option is enabled
        if (this.options.sourceMapTraceback) {
            file.luaLibFeatures.add(LuaLib_1.LuaLibFeature.SourceMapTraceBack);
        }
        const sourceRoot = this.options.sourceRoot
            ? // According to spec, sourceRoot is simply prepended to the source name, so the slash should be included
                `${this.options.sourceRoot.replace(/[\\/]+$/, "")}/`
            : "";
        const rootSourceNode = this.printFile(file);
        const sourceMap = this.buildSourceMap(sourceRoot, rootSourceNode);
        let code = rootSourceNode.toString();
        if (this.options.inlineSourceMap) {
            code += "\n" + this.printInlineSourceMap(sourceMap);
        }
        if (this.options.sourceMapTraceback) {
            const stackTraceOverride = this.printStackTraceOverride(rootSourceNode);
            code = code.replace(LuaPrinter.sourceMapTracebackPlaceholder, stackTraceOverride);
        }
        return { code, sourceMap: sourceMap.toString(), sourceMapNode: rootSourceNode };
    }
    printInlineSourceMap(sourceMap) {
        const map = sourceMap.toString();
        const base64Map = Buffer.from(map).toString("base64");
        return `--# sourceMappingURL=data:application/json;base64,${base64Map}\n`;
    }
    printStackTraceOverride(rootNode) {
        let currentLine = 1;
        const map = {};
        rootNode.walk((chunk, mappedPosition) => {
            if (mappedPosition.line !== undefined && mappedPosition.line > 0) {
                if (map[currentLine] === undefined) {
                    map[currentLine] = mappedPosition.line;
                }
                else {
                    map[currentLine] = Math.min(map[currentLine], mappedPosition.line);
                }
            }
            currentLine += chunk.split("\n").length - 1;
        });
        const mapItems = Object.entries(map).map(([line, original]) => `["${line}"] = ${original}`);
        const mapString = "{" + mapItems.join(",") + "}";
        return `__TS__SourceMapTraceBack(debug.getinfo(1).short_src, ${mapString});`;
    }
    printFile(file) {
        var _a, _b;
        let sourceChunks = [file.trivia];
        if (!this.options.noHeader) {
            sourceChunks.push(exports.tstlHeader);
        }
        const luaTarget = (_a = this.options.luaTarget) !== null && _a !== void 0 ? _a : CompilerOptions_1.LuaTarget.Universal;
        const luaLibImport = (_b = this.options.luaLibImport) !== null && _b !== void 0 ? _b : CompilerOptions_1.LuaLibImportKind.Require;
        if ((luaLibImport === CompilerOptions_1.LuaLibImportKind.Require || luaLibImport === CompilerOptions_1.LuaLibImportKind.RequireMinimal) &&
            file.luaLibFeatures.size > 0) {
            // Import lualib features
            sourceChunks = this.printStatementArray((0, LuaLib_1.loadImportedLualibFeatures)(file.luaLibFeatures, luaTarget, this.emitHost));
        }
        else if (luaLibImport === CompilerOptions_1.LuaLibImportKind.Inline && file.luaLibFeatures.size > 0) {
            // Inline lualib features
            sourceChunks.push("-- Lua Library inline imports\n");
            sourceChunks.push((0, LuaLib_1.loadInlineLualibFeatures)(file.luaLibFeatures, luaTarget, this.emitHost));
            sourceChunks.push("-- End of Lua Library inline imports\n");
        }
        if (this.options.sourceMapTraceback && !(0, CompilerOptions_1.isBundleEnabled)(this.options)) {
            // In bundle mode the traceback is being generated for the entire file in getBundleResult
            // Otherwise, traceback is being generated locally
            sourceChunks.push(`${LuaPrinter.sourceMapTracebackPlaceholder}\n`);
        }
        // Print reest of the statements in file
        sourceChunks.push(...this.printStatementArray(file.statements));
        return this.concatNodes(...sourceChunks);
    }
    pushIndent() {
        this.currentIndent += "    ";
    }
    popIndent() {
        this.currentIndent = this.currentIndent.slice(4);
    }
    indent(input = "") {
        return this.concatNodes(this.currentIndent, input);
    }
    createSourceNode(node, chunks, name) {
        const { line, column } = lua.getOriginalPos(node);
        return line !== undefined && column !== undefined
            ? new source_map_1.SourceNode(line + 1, column, this.relativeSourcePath, chunks, name)
            : new source_map_1.SourceNode(null, null, this.relativeSourcePath, chunks, name);
    }
    concatNodes(...chunks) {
        return new source_map_1.SourceNode(null, null, this.relativeSourcePath, chunks);
    }
    printBlock(block) {
        return this.concatNodes(...this.printStatementArray(block.statements));
    }
    statementMayRequireSemiColon(statement) {
        // Types of statements that could create ambiguous syntax if followed by parenthesis
        return (lua.isVariableDeclarationStatement(statement) ||
            lua.isAssignmentStatement(statement) ||
            lua.isExpressionStatement(statement));
    }
    nodeStartsWithParenthesis(sourceNode) {
        let result;
        sourceNode.walk(chunk => {
            if (result === undefined) {
                chunk = chunk.trimLeft(); // Ignore leading whitespace
                if (chunk.length > 0) {
                    result = chunk.startsWith("(");
                }
            }
        });
        return result !== null && result !== void 0 ? result : false;
    }
    printStatementArray(statements) {
        const statementNodes = [];
        for (const [index, statement] of statements.entries()) {
            const node = this.printStatement(statement);
            if (index > 0 &&
                this.statementMayRequireSemiColon(statements[index - 1]) &&
                this.nodeStartsWithParenthesis(node)) {
                statementNodes[index - 1].add(";");
            }
            statementNodes.push(node);
            if (lua.isReturnStatement(statement))
                break;
        }
        return statementNodes.length > 0 ? [...(0, utils_1.intersperse)(statementNodes, "\n"), "\n"] : [];
    }
    printStatement(statement) {
        let resultNode = this.printStatementExcludingComments(statement);
        if (statement.leadingComments) {
            resultNode = this.concatNodes(statement.leadingComments.map(c => this.printComment(c)).join("\n"), "\n", resultNode);
        }
        if (statement.trailingComments) {
            resultNode = this.concatNodes(resultNode, "\n", statement.trailingComments.map(c => this.printComment(c)).join("\n"));
        }
        return resultNode;
    }
    printComment(comment) {
        if (Array.isArray(comment)) {
            if (comment.length === 0) {
                return this.indent("--[[]]");
            }
            else {
                const [firstLine, ...restLines] = comment;
                const commentLines = this.concatNodes(...restLines.map(c => this.concatNodes("\n", this.indent(c))));
                return this.concatNodes(this.indent("--[["), firstLine, commentLines, "]]");
            }
        }
        else {
            return this.indent(`--${comment}`);
        }
    }
    printStatementExcludingComments(statement) {
        switch (statement.kind) {
            case lua.SyntaxKind.DoStatement:
                return this.printDoStatement(statement);
            case lua.SyntaxKind.VariableDeclarationStatement:
                return this.printVariableDeclarationStatement(statement);
            case lua.SyntaxKind.AssignmentStatement:
                return this.printVariableAssignmentStatement(statement);
            case lua.SyntaxKind.IfStatement:
                return this.printIfStatement(statement);
            case lua.SyntaxKind.WhileStatement:
                return this.printWhileStatement(statement);
            case lua.SyntaxKind.RepeatStatement:
                return this.printRepeatStatement(statement);
            case lua.SyntaxKind.ForStatement:
                return this.printForStatement(statement);
            case lua.SyntaxKind.ForInStatement:
                return this.printForInStatement(statement);
            case lua.SyntaxKind.GotoStatement:
                return this.printGotoStatement(statement);
            case lua.SyntaxKind.LabelStatement:
                return this.printLabelStatement(statement);
            case lua.SyntaxKind.ReturnStatement:
                return this.printReturnStatement(statement);
            case lua.SyntaxKind.BreakStatement:
                return this.printBreakStatement(statement);
            case lua.SyntaxKind.ExpressionStatement:
                return this.printExpressionStatement(statement);
            default:
                throw new Error(`Tried to print unknown statement kind: ${lua.SyntaxKind[statement.kind]}`);
        }
    }
    printDoStatement(statement) {
        const chunks = [];
        chunks.push(this.indent("do\n"));
        this.pushIndent();
        chunks.push(...this.printStatementArray(statement.statements));
        this.popIndent();
        chunks.push(this.indent("end"));
        return this.concatNodes(...chunks);
    }
    printVariableDeclarationStatement(statement) {
        const chunks = [];
        chunks.push(this.indent("local "));
        if (lua.isFunctionDefinition(statement)) {
            // Print all local functions as `local function foo()` instead of `local foo = function` to allow recursion
            chunks.push(this.printFunctionDefinition(statement));
        }
        else {
            chunks.push(...this.joinChunksWithComma(statement.left.map(e => this.printExpression(e))));
            if (statement.right) {
                chunks.push(" = ");
                chunks.push(...this.joinChunksWithComma(statement.right.map(e => this.printExpression(e))));
            }
        }
        return this.createSourceNode(statement, chunks);
    }
    printVariableAssignmentStatement(statement) {
        const chunks = [];
        chunks.push(this.indent());
        if (lua.isFunctionDefinition(statement) && (statement.right[0].flags & lua.NodeFlags.Declaration) !== 0) {
            // Use `function foo()` instead of `foo = function()`
            const name = this.printExpression(statement.left[0]);
            if (isValidLuaFunctionDeclarationName(name.toString(), this.options)) {
                chunks.push(this.printFunctionDefinition(statement));
                return this.createSourceNode(statement, chunks);
            }
        }
        chunks.push(...this.joinChunksWithComma(statement.left.map(e => this.printExpression(e))));
        chunks.push(" = ");
        chunks.push(...this.joinChunksWithComma(statement.right.map(e => this.printExpression(e))));
        return this.createSourceNode(statement, chunks);
    }
    printIfStatement(statement, isElseIf = false) {
        const chunks = [];
        const prefix = isElseIf ? "elseif" : "if";
        chunks.push(this.indent(prefix + " "), this.printExpression(statement.condition), " then\n");
        this.pushIndent();
        chunks.push(this.printBlock(statement.ifBlock));
        this.popIndent();
        if (statement.elseBlock) {
            if (lua.isIfStatement(statement.elseBlock)) {
                chunks.push(this.printIfStatement(statement.elseBlock, true));
            }
            else {
                chunks.push(this.indent("else\n"));
                this.pushIndent();
                chunks.push(this.printBlock(statement.elseBlock));
                this.popIndent();
                chunks.push(this.indent("end"));
            }
        }
        else {
            chunks.push(this.indent("end"));
        }
        return this.concatNodes(...chunks);
    }
    printWhileStatement(statement) {
        const chunks = [];
        chunks.push(this.indent("while "), this.printExpression(statement.condition), " do\n");
        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("end"));
        return this.concatNodes(...chunks);
    }
    printRepeatStatement(statement) {
        const chunks = [];
        chunks.push(this.indent("repeat\n"));
        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("until "), this.printExpression(statement.condition));
        return this.concatNodes(...chunks);
    }
    printForStatement(statement) {
        const ctrlVar = this.printExpression(statement.controlVariable);
        const ctrlVarInit = this.printExpression(statement.controlVariableInitializer);
        const limit = this.printExpression(statement.limitExpression);
        const chunks = [];
        chunks.push(this.indent("for "), ctrlVar, " = ", ctrlVarInit, ", ", limit);
        if (statement.stepExpression) {
            chunks.push(", ", this.printExpression(statement.stepExpression));
        }
        chunks.push(" do\n");
        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("end"));
        return this.concatNodes(...chunks);
    }
    printForInStatement(statement) {
        const names = this.joinChunksWithComma(statement.names.map(i => this.printIdentifier(i)));
        const expressions = this.joinChunksWithComma(statement.expressions.map(e => this.printExpression(e)));
        const chunks = [];
        chunks.push(this.indent("for "), ...names, " in ", ...expressions, " do\n");
        this.pushIndent();
        chunks.push(this.printBlock(statement.body));
        this.popIndent();
        chunks.push(this.indent("end"));
        return this.createSourceNode(statement, chunks);
    }
    printGotoStatement(statement) {
        return this.createSourceNode(statement, [this.indent("goto "), statement.label]);
    }
    printLabelStatement(statement) {
        return this.createSourceNode(statement, [this.indent("::"), statement.name, "::"]);
    }
    printReturnStatement(statement) {
        if (statement.expressions.length === 0) {
            return this.createSourceNode(statement, this.indent("return"));
        }
        const chunks = [];
        chunks.push(...this.joinChunksWithComma(statement.expressions.map(e => this.printExpression(e))));
        return this.createSourceNode(statement, [this.indent(), "return ", ...chunks]);
    }
    printBreakStatement(statement) {
        return this.createSourceNode(statement, this.indent("break"));
    }
    printExpressionStatement(statement) {
        return this.createSourceNode(statement, [this.indent(), this.printExpression(statement.expression)]);
    }
    // Expressions
    printExpression(expression) {
        switch (expression.kind) {
            case lua.SyntaxKind.StringLiteral:
                return this.printStringLiteral(expression);
            case lua.SyntaxKind.NumericLiteral:
                return this.printNumericLiteral(expression);
            case lua.SyntaxKind.NilKeyword:
                return this.printNilLiteral(expression);
            case lua.SyntaxKind.DotsKeyword:
                return this.printDotsLiteral(expression);
            case lua.SyntaxKind.ArgKeyword:
                return this.printArgLiteral(expression);
            case lua.SyntaxKind.TrueKeyword:
            case lua.SyntaxKind.FalseKeyword:
                return this.printBooleanLiteral(expression);
            case lua.SyntaxKind.FunctionExpression:
                return this.printFunctionExpression(expression);
            case lua.SyntaxKind.TableFieldExpression:
                return this.printTableFieldExpression(expression);
            case lua.SyntaxKind.TableExpression:
                return this.printTableExpression(expression);
            case lua.SyntaxKind.UnaryExpression:
                return this.printUnaryExpression(expression);
            case lua.SyntaxKind.BinaryExpression:
                return this.printBinaryExpression(expression);
            case lua.SyntaxKind.CallExpression:
                return this.printCallExpression(expression);
            case lua.SyntaxKind.MethodCallExpression:
                return this.printMethodCallExpression(expression);
            case lua.SyntaxKind.Identifier:
                return this.printIdentifier(expression);
            case lua.SyntaxKind.TableIndexExpression:
                return this.printTableIndexExpression(expression);
            default:
                throw new Error(`Tried to print unknown statement kind: ${lua.SyntaxKind[expression.kind]}`);
        }
    }
    printStringLiteral(expression) {
        return this.createSourceNode(expression, (0, exports.escapeString)(expression.value));
    }
    printNumericLiteral(expression) {
        return this.createSourceNode(expression, String(expression.value));
    }
    printNilLiteral(expression) {
        return this.createSourceNode(expression, "nil");
    }
    printDotsLiteral(expression) {
        return this.createSourceNode(expression, "...");
    }
    printArgLiteral(expression) {
        return this.createSourceNode(expression, "arg");
    }
    printBooleanLiteral(expression) {
        return this.createSourceNode(expression, expression.kind === lua.SyntaxKind.TrueKeyword ? "true" : "false");
    }
    printFunctionParameters(expression) {
        var _a;
        const parameterChunks = ((_a = expression.params) !== null && _a !== void 0 ? _a : []).map(i => this.printIdentifier(i));
        if (expression.dots) {
            parameterChunks.push(this.printDotsLiteral(expression.dots));
        }
        return this.joinChunksWithComma(parameterChunks);
    }
    printFunctionExpression(expression) {
        const chunks = [];
        chunks.push("function(");
        chunks.push(...this.printFunctionParameters(expression));
        chunks.push(")");
        if (lua.isInlineFunctionExpression(expression)) {
            const returnStatement = expression.body.statements[0];
            chunks.push(" ");
            const returnNode = [
                "return ",
                ...this.joinChunksWithComma(returnStatement.expressions.map(e => this.printExpression(e))),
            ];
            chunks.push(this.createSourceNode(returnStatement, returnNode));
            chunks.push(this.createSourceNode(expression, " end"));
        }
        else {
            chunks.push("\n");
            this.pushIndent();
            chunks.push(this.printBlock(expression.body));
            this.popIndent();
            chunks.push(this.indent(this.createSourceNode(expression, "end")));
        }
        return this.createSourceNode(expression, chunks);
    }
    printFunctionDefinition(statement) {
        const expression = statement.right[0];
        const chunks = [];
        chunks.push("function ");
        chunks.push(this.printExpression(statement.left[0]));
        chunks.push("(");
        chunks.push(...this.printFunctionParameters(expression));
        chunks.push(")\n");
        this.pushIndent();
        chunks.push(this.printBlock(expression.body));
        this.popIndent();
        chunks.push(this.indent(this.createSourceNode(statement, "end")));
        return this.createSourceNode(expression, chunks);
    }
    printTableFieldExpression(expression) {
        const chunks = [];
        const value = this.printExpression(expression.value);
        if (expression.key) {
            if (lua.isStringLiteral(expression.key) && (0, safe_names_1.isValidLuaIdentifier)(expression.key.value, this.options)) {
                chunks.push(expression.key.value, " = ", value);
            }
            else {
                chunks.push("[", this.printExpression(expression.key), "] = ", value);
            }
        }
        else {
            chunks.push(value);
        }
        return this.createSourceNode(expression, chunks);
    }
    printTableExpression(expression) {
        return this.createSourceNode(expression, ["{", ...this.printExpressionList(expression.fields), "}"]);
    }
    printUnaryExpression(expression) {
        const chunks = [];
        chunks.push(this.printOperator(expression.operator));
        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.operand, LuaPrinter.operatorPrecedence[expression.operator]));
        return this.createSourceNode(expression, chunks);
    }
    printBinaryExpression(expression) {
        const chunks = [];
        const isRightAssociative = LuaPrinter.rightAssociativeOperators.has(expression.operator);
        const precedence = LuaPrinter.operatorPrecedence[expression.operator];
        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.left, isRightAssociative ? precedence + 1 : precedence));
        chunks.push(" ", this.printOperator(expression.operator), " ");
        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.right, isRightAssociative ? precedence : precedence + 1));
        return this.createSourceNode(expression, chunks);
    }
    printExpressionInParenthesesIfNeeded(expression, minPrecedenceToOmit) {
        return this.needsParenthesis(expression, minPrecedenceToOmit)
            ? this.createSourceNode(expression, ["(", this.printExpression(expression), ")"])
            : this.printExpression(expression);
    }
    needsParenthesis(expression, minPrecedenceToOmit) {
        if (lua.isBinaryExpression(expression) || lua.isUnaryExpression(expression)) {
            return (minPrecedenceToOmit === undefined ||
                LuaPrinter.operatorPrecedence[expression.operator] < minPrecedenceToOmit);
        }
        else {
            return lua.isFunctionExpression(expression) || lua.isTableExpression(expression);
        }
    }
    printCallExpression(expression) {
        const chunks = [];
        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.expression), "(");
        if (expression.params) {
            chunks.push(...this.printExpressionList(expression.params));
        }
        chunks.push(")");
        return this.createSourceNode(expression, chunks);
    }
    printMethodCallExpression(expression) {
        const chunks = [];
        const prefix = this.needsParenthesis(expression.prefixExpression) || lua.isStringLiteral(expression.prefixExpression)
            ? ["(", this.printExpression(expression.prefixExpression), ")"]
            : [this.printExpression(expression.prefixExpression)];
        const name = this.printIdentifier(expression.name);
        chunks.push(...prefix, ":", name, "(");
        if (expression.params) {
            chunks.push(...this.printExpressionList(expression.params));
        }
        chunks.push(")");
        return this.createSourceNode(expression, chunks);
    }
    printIdentifier(expression) {
        return this.createSourceNode(expression, expression.text, expression.originalName !== expression.text ? expression.originalName : undefined);
    }
    printTableIndexExpression(expression) {
        const chunks = [];
        chunks.push(this.printExpressionInParenthesesIfNeeded(expression.table));
        if (lua.isStringLiteral(expression.index) && (0, safe_names_1.isValidLuaIdentifier)(expression.index.value, this.options)) {
            chunks.push(".", this.createSourceNode(expression.index, expression.index.value));
        }
        else {
            chunks.push("[", this.printExpression(expression.index), "]");
        }
        return this.createSourceNode(expression, chunks);
    }
    printOperator(kind) {
        return new source_map_1.SourceNode(null, null, this.relativeSourcePath, LuaPrinter.operatorMap[kind]);
    }
    joinChunksWithComma(chunks) {
        return (0, utils_1.intersperse)(chunks, ", ");
    }
    /**
     * Returns true if the expression list (table field or parameters) should be printed on one line.
     */
    isSimpleExpressionList(expressions) {
        if (expressions.length <= 1)
            return true;
        if (expressions.length > 4)
            return false;
        return expressions.every(isSimpleExpression);
    }
    printExpressionList(expressions) {
        const chunks = [];
        if (this.isSimpleExpressionList(expressions)) {
            chunks.push(...this.joinChunksWithComma(expressions.map(e => this.printExpression(e))));
        }
        else {
            chunks.push("\n");
            this.pushIndent();
            for (const [index, expression] of expressions.entries()) {
                const tail = index < expressions.length - 1 ? ",\n" : "\n";
                chunks.push(this.indent(), this.printExpression(expression), tail);
            }
            this.popIndent();
            chunks.push(this.indent());
        }
        return chunks;
    }
    // The key difference between this and SourceNode.toStringWithSourceMap() is that SourceNodes with null line/column
    // will not generate 'empty' mappings in the source map that point to nothing in the original TS.
    buildSourceMap(sourceRoot, rootSourceNode) {
        const map = new source_map_1.SourceMapGenerator({
            file: path.basename(this.luaFile),
            sourceRoot,
        });
        let generatedLine = 1;
        let generatedColumn = 0;
        let currentMapping;
        const isNewMapping = (sourceNode) => {
            if (sourceNode.line === null) {
                return false;
            }
            if (currentMapping === undefined) {
                return true;
            }
            if (currentMapping.generated.line === generatedLine &&
                currentMapping.generated.column === generatedColumn &&
                currentMapping.name === sourceNode.name) {
                return false;
            }
            return (currentMapping.original.line !== sourceNode.line ||
                currentMapping.original.column !== sourceNode.column ||
                currentMapping.name !== sourceNode.name);
        };
        const build = (sourceNode) => {
            if (isNewMapping(sourceNode)) {
                currentMapping = {
                    source: sourceNode.source,
                    original: { line: sourceNode.line, column: sourceNode.column },
                    generated: { line: generatedLine, column: generatedColumn },
                    name: sourceNode.name,
                };
                map.addMapping(currentMapping);
            }
            for (const chunk of sourceNode.children) {
                if (typeof chunk === "string") {
                    const lines = chunk.split("\n");
                    if (lines.length > 1) {
                        generatedLine += lines.length - 1;
                        generatedColumn = 0;
                        currentMapping = undefined; // Mappings end at newlines
                    }
                    generatedColumn += lines[lines.length - 1].length;
                }
                else {
                    build(chunk);
                }
            }
        };
        build(rootSourceNode);
        return map;
    }
}
LuaPrinter.operatorMap = {
    [lua.SyntaxKind.AdditionOperator]: "+",
    [lua.SyntaxKind.SubtractionOperator]: "-",
    [lua.SyntaxKind.MultiplicationOperator]: "*",
    [lua.SyntaxKind.DivisionOperator]: "/",
    [lua.SyntaxKind.FloorDivisionOperator]: "//",
    [lua.SyntaxKind.ModuloOperator]: "%",
    [lua.SyntaxKind.PowerOperator]: "^",
    [lua.SyntaxKind.NegationOperator]: "-",
    [lua.SyntaxKind.ConcatOperator]: "..",
    [lua.SyntaxKind.LengthOperator]: "#",
    [lua.SyntaxKind.EqualityOperator]: "==",
    [lua.SyntaxKind.InequalityOperator]: "~=",
    [lua.SyntaxKind.LessThanOperator]: "<",
    [lua.SyntaxKind.LessEqualOperator]: "<=",
    [lua.SyntaxKind.GreaterThanOperator]: ">",
    [lua.SyntaxKind.GreaterEqualOperator]: ">=",
    [lua.SyntaxKind.AndOperator]: "and",
    [lua.SyntaxKind.OrOperator]: "or",
    [lua.SyntaxKind.NotOperator]: "not ",
    [lua.SyntaxKind.BitwiseAndOperator]: "&",
    [lua.SyntaxKind.BitwiseOrOperator]: "|",
    [lua.SyntaxKind.BitwiseExclusiveOrOperator]: "~",
    [lua.SyntaxKind.BitwiseRightShiftOperator]: ">>",
    [lua.SyntaxKind.BitwiseLeftShiftOperator]: "<<",
    [lua.SyntaxKind.BitwiseNotOperator]: "~",
};
LuaPrinter.operatorPrecedence = {
    [lua.SyntaxKind.OrOperator]: 1,
    [lua.SyntaxKind.AndOperator]: 2,
    [lua.SyntaxKind.EqualityOperator]: 3,
    [lua.SyntaxKind.InequalityOperator]: 3,
    [lua.SyntaxKind.LessThanOperator]: 3,
    [lua.SyntaxKind.LessEqualOperator]: 3,
    [lua.SyntaxKind.GreaterThanOperator]: 3,
    [lua.SyntaxKind.GreaterEqualOperator]: 3,
    [lua.SyntaxKind.BitwiseOrOperator]: 4,
    [lua.SyntaxKind.BitwiseExclusiveOrOperator]: 5,
    [lua.SyntaxKind.BitwiseAndOperator]: 6,
    [lua.SyntaxKind.BitwiseLeftShiftOperator]: 7,
    [lua.SyntaxKind.BitwiseRightShiftOperator]: 7,
    [lua.SyntaxKind.ConcatOperator]: 8,
    [lua.SyntaxKind.AdditionOperator]: 9,
    [lua.SyntaxKind.SubtractionOperator]: 9,
    [lua.SyntaxKind.MultiplicationOperator]: 10,
    [lua.SyntaxKind.DivisionOperator]: 10,
    [lua.SyntaxKind.FloorDivisionOperator]: 10,
    [lua.SyntaxKind.ModuloOperator]: 10,
    [lua.SyntaxKind.NotOperator]: 11,
    [lua.SyntaxKind.LengthOperator]: 11,
    [lua.SyntaxKind.NegationOperator]: 11,
    [lua.SyntaxKind.BitwiseNotOperator]: 11,
    [lua.SyntaxKind.PowerOperator]: 12,
};
LuaPrinter.rightAssociativeOperators = new Set([lua.SyntaxKind.ConcatOperator, lua.SyntaxKind.PowerOperator]);
LuaPrinter.sourceMapTracebackPlaceholder = "{#SourceMapTraceback}";
exports.LuaPrinter = LuaPrinter;
//# sourceMappingURL=LuaPrinter.js.map
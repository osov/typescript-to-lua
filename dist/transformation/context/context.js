"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformationContext = exports.tempSymbolId = void 0;
const ts = require("typescript");
const CompilerOptions_1 = require("../../CompilerOptions");
const lua = require("../../LuaAST");
const utils_1 = require("../../utils");
const diagnostics_1 = require("../utils/diagnostics");
const lua_ast_1 = require("../utils/lua-ast");
const safe_names_1 = require("../utils/safe-names");
exports.tempSymbolId = -1;
class TransformationContext {
    constructor(program, sourceFile, visitorMap) {
        var _a, _b, _c;
        this.program = program;
        this.sourceFile = sourceFile;
        this.visitorMap = visitorMap;
        this.diagnostics = [];
        this.checker = this.program.getTypeChecker();
        this.precedingStatementsStack = [];
        this.options = this.program.getCompilerOptions();
        this.luaTarget = (_a = this.options.luaTarget) !== null && _a !== void 0 ? _a : CompilerOptions_1.LuaTarget.Universal;
        this.isModule = ts.isExternalModule(this.sourceFile);
        this.isStrict = ((_b = this.options.alwaysStrict) !== null && _b !== void 0 ? _b : this.options.strict) ||
            (this.isModule && this.options.target !== undefined && this.options.target >= ts.ScriptTarget.ES2015);
        this.currentNodeVisitors = [];
        this.currentNodeVisitorsIndex = 0;
        this.nextTempId = 0;
        // other utils
        this.lastSymbolId = 0;
        this.symbolInfoMap = new Map();
        this.symbolIdMaps = new Map();
        this.usedLuaLibFeatures = new Set();
        this.scopeStack = [];
        this.lastScopeId = 0;
        /** @internal */
        this.classSuperInfos = [];
        // Use `getParseTreeNode` to get original SourceFile node, before it was substituted by custom transformers.
        // It's required because otherwise `getEmitResolver` won't use cached diagnostics, produced in `emitWorker`
        // and would try to re-analyze the file, which would fail because of replaced nodes.
        const originalSourceFile = (_c = ts.getParseTreeNode(sourceFile, ts.isSourceFile)) !== null && _c !== void 0 ? _c : sourceFile;
        this.resolver = this.checker.getEmitResolver(originalSourceFile);
    }
    transformNode(node) {
        return (0, lua_ast_1.unwrapVisitorResult)(this.transformNodeRaw(node));
    }
    /** @internal */
    transformNodeRaw(node, isExpression) {
        var _a;
        // TODO: Move to visitors?
        if (ts.canHaveModifiers(node) &&
            ((_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword))) {
            return [];
        }
        const nodeVisitors = this.visitorMap.get(node.kind);
        if (!nodeVisitors) {
            this.diagnostics.push((0, diagnostics_1.unsupportedNodeKind)(node, node.kind));
            return isExpression ? [lua.createNilLiteral()] : [];
        }
        const previousNodeVisitors = this.currentNodeVisitors;
        const previousNodeVisitorsIndex = this.currentNodeVisitorsIndex;
        this.currentNodeVisitors = nodeVisitors;
        this.currentNodeVisitorsIndex = nodeVisitors.length - 1;
        const visitor = this.currentNodeVisitors[this.currentNodeVisitorsIndex];
        const result = visitor(node, this);
        this.currentNodeVisitors = previousNodeVisitors;
        this.currentNodeVisitorsIndex = previousNodeVisitorsIndex;
        return result;
    }
    superTransformNode(node) {
        return (0, lua_ast_1.unwrapVisitorResult)(this.doSuperTransformNode(node));
    }
    doSuperTransformNode(node) {
        if (--this.currentNodeVisitorsIndex < 0) {
            throw new Error(`There is no super transform for ${ts.SyntaxKind[node.kind]} visitor`);
        }
        const visitor = this.currentNodeVisitors[this.currentNodeVisitorsIndex];
        return (0, lua_ast_1.unwrapVisitorResult)(visitor(node, this));
    }
    transformExpression(node) {
        const result = this.transformNodeRaw(node, true);
        return this.assertIsExpression(node, result);
    }
    assertIsExpression(node, result) {
        if (result === undefined) {
            throw new Error(`Expression visitor for node type ${ts.SyntaxKind[node.kind]} did not return any result.`);
        }
        if (Array.isArray(result)) {
            return result[0];
        }
        return result;
    }
    superTransformExpression(node) {
        const result = this.doSuperTransformNode(node);
        return this.assertIsExpression(node, result);
    }
    transformStatements(node) {
        return (0, utils_1.castArray)(node).flatMap(n => {
            this.pushPrecedingStatements();
            const statements = this.transformNode(n);
            const result = this.popPrecedingStatements();
            result.push(...statements);
            return result;
        });
    }
    superTransformStatements(node) {
        return (0, utils_1.castArray)(node).flatMap(n => {
            this.pushPrecedingStatements();
            const statements = this.superTransformNode(n);
            const result = this.popPrecedingStatements();
            result.push(...statements);
            return result;
        });
    }
    pushPrecedingStatements() {
        this.precedingStatementsStack.push([]);
    }
    popPrecedingStatements() {
        const precedingStatements = this.precedingStatementsStack.pop();
        (0, utils_1.assert)(precedingStatements);
        return precedingStatements;
    }
    addPrecedingStatements(statements) {
        const precedingStatements = this.precedingStatementsStack[this.precedingStatementsStack.length - 1];
        (0, utils_1.assert)(precedingStatements);
        if (Array.isArray(statements)) {
            precedingStatements.push(...statements);
        }
        else {
            precedingStatements.push(statements);
        }
    }
    prependPrecedingStatements(statements) {
        const precedingStatements = this.precedingStatementsStack[this.precedingStatementsStack.length - 1];
        (0, utils_1.assert)(precedingStatements);
        if (Array.isArray(statements)) {
            precedingStatements.unshift(...statements);
        }
        else {
            precedingStatements.unshift(statements);
        }
    }
    createTempName(prefix = "temp") {
        prefix = prefix.replace(/^_*/, ""); // Strip leading underscores because createSafeName will add them again
        return (0, safe_names_1.createSafeName)(`${prefix}_${this.nextTempId++}`);
    }
    getTempNameForLuaExpression(expression) {
        if (lua.isStringLiteral(expression)) {
            return expression.value;
        }
        else if (lua.isNumericLiteral(expression)) {
            return `_${expression.value.toString()}`;
        }
        else if (lua.isIdentifier(expression)) {
            return expression.text;
        }
        else if (lua.isCallExpression(expression)) {
            const name = this.getTempNameForLuaExpression(expression.expression);
            if (name) {
                return `${name}_result`;
            }
        }
        else if (lua.isTableIndexExpression(expression)) {
            const tableName = this.getTempNameForLuaExpression(expression.table);
            const indexName = this.getTempNameForLuaExpression(expression.index);
            if (tableName || indexName) {
                return `${tableName !== null && tableName !== void 0 ? tableName : "table"}_${indexName !== null && indexName !== void 0 ? indexName : "index"}`;
            }
        }
    }
    createTempNameForLuaExpression(expression) {
        const name = this.getTempNameForLuaExpression(expression);
        const identifier = lua.createIdentifier(this.createTempName(name), undefined, exports.tempSymbolId);
        lua.setNodePosition(identifier, lua.getOriginalPos(expression));
        return identifier;
    }
    getTempNameForNode(node) {
        if (ts.isStringLiteral(node) || ts.isIdentifier(node) || ts.isMemberName(node)) {
            return node.text;
        }
        else if (ts.isNumericLiteral(node)) {
            return `_${node.text}`;
        }
        else if (ts.isCallExpression(node)) {
            const name = this.getTempNameForNode(node.expression);
            if (name) {
                return `${name}_result`;
            }
        }
        else if (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node)) {
            const tableName = this.getTempNameForNode(node.expression);
            const indexName = ts.isElementAccessExpression(node)
                ? this.getTempNameForNode(node.argumentExpression)
                : node.name.text;
            if (tableName || indexName) {
                return `${tableName !== null && tableName !== void 0 ? tableName : "table"}_${indexName !== null && indexName !== void 0 ? indexName : "index"}`;
            }
        }
    }
    createTempNameForNode(node) {
        const name = this.getTempNameForNode(node);
        return lua.createIdentifier(this.createTempName(name), node, exports.tempSymbolId);
    }
    nextSymbolId() {
        return ++this.lastSymbolId;
    }
    pushScope(type) {
        const scope = { type, id: ++this.lastScopeId };
        this.scopeStack.push(scope);
        return scope;
    }
    popScope() {
        const scope = this.scopeStack.pop();
        (0, utils_1.assert)(scope);
        return scope;
    }
}
exports.TransformationContext = TransformationContext;
//# sourceMappingURL=context.js.map
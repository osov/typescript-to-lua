"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performHoisting = exports.separateHoistedStatements = exports.isFunctionScopeWithDefinition = exports.hasReferencedSymbol = exports.hasReferencedUndefinedLocalFunction = exports.addScopeVariableDeclaration = exports.findScope = exports.peekScope = exports.markSymbolAsReferencedInCurrentScopes = exports.walkScopesUp = exports.ScopeType = void 0;
const ts = require("typescript");
const lua = require("../../LuaAST");
const utils_1 = require("../../utils");
const symbols_1 = require("./symbols");
const typescript_1 = require("./typescript");
var ScopeType;
(function (ScopeType) {
    ScopeType[ScopeType["File"] = 1] = "File";
    ScopeType[ScopeType["Function"] = 2] = "Function";
    ScopeType[ScopeType["Switch"] = 4] = "Switch";
    ScopeType[ScopeType["Loop"] = 8] = "Loop";
    ScopeType[ScopeType["Conditional"] = 16] = "Conditional";
    ScopeType[ScopeType["Block"] = 32] = "Block";
    ScopeType[ScopeType["Try"] = 64] = "Try";
    ScopeType[ScopeType["Catch"] = 128] = "Catch";
    ScopeType[ScopeType["LoopInitializer"] = 256] = "LoopInitializer";
})(ScopeType = exports.ScopeType || (exports.ScopeType = {}));
function* walkScopesUp(context) {
    const scopeStack = context.scopeStack;
    for (let i = scopeStack.length - 1; i >= 0; --i) {
        const scope = scopeStack[i];
        yield scope;
    }
}
exports.walkScopesUp = walkScopesUp;
function markSymbolAsReferencedInCurrentScopes(context, symbolId, identifier) {
    for (const scope of context.scopeStack) {
        if (!scope.referencedSymbols) {
            scope.referencedSymbols = new Map();
        }
        const references = (0, utils_1.getOrUpdate)(scope.referencedSymbols, symbolId, () => []);
        references.push(identifier);
    }
}
exports.markSymbolAsReferencedInCurrentScopes = markSymbolAsReferencedInCurrentScopes;
function peekScope(context) {
    const scopeStack = context.scopeStack;
    const scope = scopeStack[scopeStack.length - 1];
    (0, utils_1.assert)(scope);
    return scope;
}
exports.peekScope = peekScope;
function findScope(context, scopeTypes) {
    for (let i = context.scopeStack.length - 1; i >= 0; --i) {
        const scope = context.scopeStack[i];
        if (scopeTypes & scope.type) {
            return scope;
        }
    }
}
exports.findScope = findScope;
function addScopeVariableDeclaration(scope, declaration) {
    if (!scope.variableDeclarations) {
        scope.variableDeclarations = [];
    }
    scope.variableDeclarations.push(declaration);
}
exports.addScopeVariableDeclaration = addScopeVariableDeclaration;
function isHoistableFunctionDeclaredInScope(symbol, scopeNode) {
    var _a;
    return (_a = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _a === void 0 ? void 0 : _a.some(d => ts.isFunctionDeclaration(d) && (0, typescript_1.findFirstNodeAbove)(d, (n) => n === scopeNode));
}
// Checks for references to local functions which haven't been defined yet,
// and thus will be hoisted above the current position.
function hasReferencedUndefinedLocalFunction(context, scope) {
    var _a;
    if (!scope.referencedSymbols || !scope.node) {
        return false;
    }
    for (const [symbolId, nodes] of scope.referencedSymbols) {
        const type = context.checker.getTypeAtLocation(nodes[0]);
        if (!((_a = scope.functionDefinitions) === null || _a === void 0 ? void 0 : _a.has(symbolId)) &&
            type.getCallSignatures().length > 0 &&
            isHoistableFunctionDeclaredInScope(type.symbol, scope.node)) {
            return true;
        }
    }
    return false;
}
exports.hasReferencedUndefinedLocalFunction = hasReferencedUndefinedLocalFunction;
function hasReferencedSymbol(context, scope, symbol) {
    if (!scope.referencedSymbols) {
        return;
    }
    for (const nodes of scope.referencedSymbols.values()) {
        if (nodes.some(node => context.checker.getSymbolAtLocation(node) === symbol)) {
            return true;
        }
    }
    return false;
}
exports.hasReferencedSymbol = hasReferencedSymbol;
function isFunctionScopeWithDefinition(scope) {
    return scope.node !== undefined && ts.isFunctionLike(scope.node);
}
exports.isFunctionScopeWithDefinition = isFunctionScopeWithDefinition;
function separateHoistedStatements(context, statements) {
    const scope = peekScope(context);
    const allHoistedStatments = [];
    const allHoistedIdentifiers = [];
    let { unhoistedStatements, hoistedStatements, hoistedIdentifiers } = hoistFunctionDefinitions(context, scope, statements);
    allHoistedStatments.push(...hoistedStatements);
    allHoistedIdentifiers.push(...hoistedIdentifiers);
    ({ unhoistedStatements, hoistedIdentifiers } = hoistVariableDeclarations(context, scope, unhoistedStatements));
    allHoistedIdentifiers.push(...hoistedIdentifiers);
    ({ unhoistedStatements, hoistedStatements } = hoistImportStatements(scope, unhoistedStatements));
    allHoistedStatments.unshift(...hoistedStatements);
    return {
        statements: unhoistedStatements,
        hoistedStatements: allHoistedStatments,
        hoistedIdentifiers: allHoistedIdentifiers,
    };
}
exports.separateHoistedStatements = separateHoistedStatements;
function performHoisting(context, statements) {
    const result = separateHoistedStatements(context, statements);
    const modifiedStatements = [...result.hoistedStatements, ...result.statements];
    if (result.hoistedIdentifiers.length > 0) {
        modifiedStatements.unshift(lua.createVariableDeclarationStatement(result.hoistedIdentifiers));
    }
    return modifiedStatements;
}
exports.performHoisting = performHoisting;
function shouldHoistSymbol(context, symbolId, scope) {
    // Always hoist in top-level of switch statements
    if (scope.type === ScopeType.Switch) {
        return true;
    }
    const symbolInfo = (0, symbols_1.getSymbolInfo)(context, symbolId);
    if (!symbolInfo) {
        return false;
    }
    const declaration = (0, typescript_1.getFirstDeclarationInFile)(symbolInfo.symbol, context.sourceFile);
    if (!declaration) {
        return false;
    }
    if (symbolInfo.firstSeenAtPos < declaration.pos) {
        return true;
    }
    if (scope.functionDefinitions) {
        for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
            (0, utils_1.assert)(functionDefinition.definition);
            const { line, column } = lua.getOriginalPos(functionDefinition.definition);
            if (line !== undefined && column !== undefined) {
                const definitionPos = ts.getPositionOfLineAndCharacter(context.sourceFile, line, column);
                if (functionSymbolId !== symbolId && // Don't recurse into self
                    declaration.pos < definitionPos && // Ignore functions before symbol declaration
                    functionDefinition.referencedSymbols.has(symbolId) &&
                    shouldHoistSymbol(context, functionSymbolId, scope)) {
                    return true;
                }
            }
        }
    }
    return false;
}
function hoistVariableDeclarations(context, scope, statements) {
    if (!scope.variableDeclarations) {
        return { unhoistedStatements: statements, hoistedIdentifiers: [] };
    }
    const unhoistedStatements = [...statements];
    const hoistedIdentifiers = [];
    for (const declaration of scope.variableDeclarations) {
        const symbols = declaration.left.map(i => i.symbolId).filter(utils_1.isNonNull);
        if (symbols.some(s => shouldHoistSymbol(context, s, scope))) {
            const index = unhoistedStatements.indexOf(declaration);
            if (index < 0) {
                continue; // statements array may not contain all statements in the scope (switch-case)
            }
            if (declaration.right) {
                const assignment = lua.createAssignmentStatement(declaration.left, declaration.right);
                lua.setNodePosition(assignment, declaration); // Preserve position info for sourcemap
                unhoistedStatements.splice(index, 1, assignment);
            }
            else {
                unhoistedStatements.splice(index, 1);
            }
            hoistedIdentifiers.push(...declaration.left);
        }
    }
    return { unhoistedStatements, hoistedIdentifiers };
}
function hoistFunctionDefinitions(context, scope, statements) {
    if (!scope.functionDefinitions) {
        return { unhoistedStatements: statements, hoistedStatements: [], hoistedIdentifiers: [] };
    }
    const unhoistedStatements = [...statements];
    const hoistedStatements = [];
    const hoistedIdentifiers = [];
    for (const [functionSymbolId, functionDefinition] of scope.functionDefinitions) {
        (0, utils_1.assert)(functionDefinition.definition);
        if (shouldHoistSymbol(context, functionSymbolId, scope)) {
            const index = unhoistedStatements.indexOf(functionDefinition.definition);
            if (index < 0) {
                continue; // statements array may not contain all statements in the scope (switch-case)
            }
            unhoistedStatements.splice(index, 1);
            if (lua.isVariableDeclarationStatement(functionDefinition.definition)) {
                // Separate function definition and variable declaration
                (0, utils_1.assert)(functionDefinition.definition.right);
                hoistedIdentifiers.push(...functionDefinition.definition.left);
                hoistedStatements.push(lua.createAssignmentStatement(functionDefinition.definition.left, functionDefinition.definition.right));
            }
            else {
                hoistedStatements.push(functionDefinition.definition);
            }
        }
    }
    return { unhoistedStatements, hoistedStatements, hoistedIdentifiers };
}
function hoistImportStatements(scope, statements) {
    var _a;
    return { unhoistedStatements: statements, hoistedStatements: (_a = scope.importStatements) !== null && _a !== void 0 ? _a : [] };
}
//# sourceMappingURL=scope.js.map
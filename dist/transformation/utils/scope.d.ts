import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
export declare enum ScopeType {
    File = 1,
    Function = 2,
    Switch = 4,
    Loop = 8,
    Conditional = 16,
    Block = 32,
    Try = 64,
    Catch = 128,
    LoopInitializer = 256
}
interface FunctionDefinitionInfo {
    referencedSymbols: Map<lua.SymbolId, ts.Node[]>;
    definition?: lua.VariableDeclarationStatement | lua.AssignmentStatement;
}
export interface Scope {
    type: ScopeType;
    id: number;
    node?: ts.Node;
    referencedSymbols?: Map<lua.SymbolId, ts.Node[]>;
    variableDeclarations?: lua.VariableDeclarationStatement[];
    functionDefinitions?: Map<lua.SymbolId, FunctionDefinitionInfo>;
    importStatements?: lua.Statement[];
    loopContinued?: boolean;
    functionReturned?: boolean;
}
export interface HoistingResult {
    statements: lua.Statement[];
    hoistedStatements: lua.Statement[];
    hoistedIdentifiers: lua.Identifier[];
}
export declare function walkScopesUp(context: TransformationContext): IterableIterator<Scope>;
export declare function markSymbolAsReferencedInCurrentScopes(context: TransformationContext, symbolId: lua.SymbolId, identifier: ts.Identifier): void;
export declare function peekScope(context: TransformationContext): Scope;
export declare function findScope(context: TransformationContext, scopeTypes: ScopeType): Scope | undefined;
export declare function addScopeVariableDeclaration(scope: Scope, declaration: lua.VariableDeclarationStatement): void;
export declare function hasReferencedUndefinedLocalFunction(context: TransformationContext, scope: Scope): boolean;
export declare function hasReferencedSymbol(context: TransformationContext, scope: Scope, symbol: ts.Symbol): boolean | undefined;
export declare function isFunctionScopeWithDefinition(scope: Scope): scope is Scope & {
    node: ts.SignatureDeclaration;
};
export declare function separateHoistedStatements(context: TransformationContext, statements: lua.Statement[]): HoistingResult;
export declare function performHoisting(context: TransformationContext, statements: lua.Statement[]): lua.Statement[];
export {};

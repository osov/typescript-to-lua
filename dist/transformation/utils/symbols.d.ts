import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
export interface SymbolInfo {
    symbol: ts.Symbol;
    firstSeenAtPos: number;
}
export declare function getSymbolInfo(context: TransformationContext, symbolId: lua.SymbolId): SymbolInfo | undefined;
export declare function getSymbolIdOfSymbol(context: TransformationContext, symbol: ts.Symbol): lua.SymbolId | undefined;
export declare function trackSymbolReference(context: TransformationContext, symbol: ts.Symbol, identifier: ts.Identifier): lua.SymbolId | undefined;
export declare function getIdentifierSymbolId(context: TransformationContext, identifier: ts.Identifier, symbol: ts.Symbol | undefined): lua.SymbolId | undefined;

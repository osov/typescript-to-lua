import * as ts from "typescript";
import { CompilerOptions } from "../..";
import { TransformationContext } from "../context";
export declare const shouldAllowUnicode: (options: CompilerOptions) => boolean;
export declare const isValidLuaIdentifier: (name: string, options: CompilerOptions) => boolean;
export declare const luaKeywords: ReadonlySet<string>;
export declare const isUnsafeName: (name: string, options: CompilerOptions) => boolean;
export declare function hasUnsafeSymbolName(context: TransformationContext, symbol: ts.Symbol, tsOriginal: ts.Identifier): boolean;
export declare function hasUnsafeIdentifierName(context: TransformationContext, identifier: ts.Identifier, symbol: ts.Symbol | undefined): boolean;
export declare const createSafeName: (name: string) => string;

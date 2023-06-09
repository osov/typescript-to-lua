import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
export declare const transformAwaitExpression: FunctionVisitor<ts.AwaitExpression>;
export declare function isAsyncFunction(declaration: ts.FunctionLikeDeclaration): boolean;
export declare function wrapInAsyncAwaiter(context: TransformationContext, statements: lua.Statement[], includeResolveParameter?: boolean): lua.CallExpression;

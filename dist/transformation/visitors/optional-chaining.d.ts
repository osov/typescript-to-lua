import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
export interface ExpressionWithThisValue {
    expression: lua.Expression;
    thisValue?: lua.Expression;
}
export declare function captureThisValue(context: TransformationContext, expression: lua.Expression, thisValueCapture: lua.Identifier, tsOriginal: ts.Node): lua.Expression;
export interface OptionalContinuation {
    contextualCall?: lua.CallExpression;
    usedIdentifiers: lua.Identifier[];
}
export declare function isOptionalContinuation(node: ts.Node): boolean;
export declare function getOptionalContinuationData(identifier: ts.Identifier): OptionalContinuation | undefined;
export declare function transformOptionalChain(context: TransformationContext, node: ts.OptionalChain): lua.Expression;
export declare function transformOptionalChainWithCapture(context: TransformationContext, tsNode: ts.OptionalChain, thisValueCapture: lua.Identifier | undefined, isDelete?: ts.DeleteExpression): ExpressionWithThisValue;
export declare function transformOptionalDeleteExpression(context: TransformationContext, node: ts.DeleteExpression, innerExpression: ts.OptionalChain): lua.BooleanLiteral;

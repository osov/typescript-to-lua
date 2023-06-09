import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
export declare function validateArguments(context: TransformationContext, params: readonly ts.Expression[], signature?: ts.Signature): void;
export declare function transformArguments(context: TransformationContext, params: readonly ts.Expression[], signature?: ts.Signature, callContext?: ts.Expression): lua.Expression[];
export declare function transformCallAndArguments(context: TransformationContext, callExpression: ts.Expression, params: readonly ts.Expression[], signature?: ts.Signature, callContext?: ts.Expression): [lua.Expression, lua.Expression[]];
export declare function transformContextualCallExpression(context: TransformationContext, node: ts.CallExpression | ts.TaggedTemplateExpression, args: ts.Expression[] | ts.NodeArray<ts.Expression>, signature?: ts.Signature): lua.Expression;
export declare const transformCallExpression: FunctionVisitor<ts.CallExpression>;
export declare function getCalledExpression(node: ts.CallExpression): ts.Expression;

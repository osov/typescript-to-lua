import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { ExpressionWithThisValue } from "./optional-chaining";
export declare function transformElementAccessArgument(context: TransformationContext, node: ts.ElementAccessExpression): lua.Expression;
export declare const transformElementAccessExpression: FunctionVisitor<ts.ElementAccessExpression>;
export declare function transformElementAccessExpressionWithCapture(context: TransformationContext, node: ts.ElementAccessExpression, thisValueCapture: lua.Identifier | undefined): ExpressionWithThisValue;
export declare const transformPropertyAccessExpression: FunctionVisitor<ts.PropertyAccessExpression>;
export declare function transformPropertyAccessExpressionWithCapture(context: TransformationContext, node: ts.PropertyAccessExpression, thisValueCapture: lua.Identifier | undefined): ExpressionWithThisValue;
export declare const transformQualifiedName: FunctionVisitor<ts.QualifiedName>;
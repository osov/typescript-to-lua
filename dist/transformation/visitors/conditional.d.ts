import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
export declare const transformConditionalExpression: FunctionVisitor<ts.ConditionalExpression>;
export declare function transformIfStatement(statement: ts.IfStatement, context: TransformationContext): lua.IfStatement;
export declare function checkOnlyTruthyCondition(condition: ts.Expression, context: TransformationContext): void;

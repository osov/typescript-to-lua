import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
export declare function transformArrayBindingElement(context: TransformationContext, name: ts.ArrayBindingElement): lua.Identifier;
export declare function transformBindingPattern(context: TransformationContext, pattern: ts.BindingPattern, table: lua.Expression, propertyAccessStack?: ts.PropertyName[]): lua.Statement[];
export declare function transformBindingVariableDeclaration(context: TransformationContext, bindingPattern: ts.BindingPattern, initializer?: ts.Expression): lua.Statement[];
export declare function transformVariableDeclaration(context: TransformationContext, statement: ts.VariableDeclaration): lua.Statement[];
export declare function checkVariableDeclarationList(context: TransformationContext, node: ts.VariableDeclarationList): void;
export declare const transformVariableStatement: FunctionVisitor<ts.VariableStatement>;

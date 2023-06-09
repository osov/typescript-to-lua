import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
export declare function createClassSetup(context: TransformationContext, statement: ts.ClassLikeDeclarationBase, className: lua.Identifier, localClassName: lua.Identifier, extendsType?: ts.Type): lua.Statement[];
export declare function getReflectionClassName(declaration: ts.ClassLikeDeclarationBase, className: lua.Identifier): lua.Expression;

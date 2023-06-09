import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { LuaLibFeature } from "../../LuaLib";
import { TransformationContext } from "../context";
export { LuaLibFeature };
export declare function importLuaLibFeature(context: TransformationContext, feature: LuaLibFeature): void;
export declare function transformLuaLibFunction(context: TransformationContext, feature: LuaLibFeature, tsParent?: ts.Node, ...params: lua.Expression[]): lua.CallExpression;

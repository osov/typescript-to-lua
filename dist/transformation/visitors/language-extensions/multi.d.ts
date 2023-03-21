import * as ts from "typescript";
import { TransformationContext } from "../../context";
export declare function isMultiReturnType(type: ts.Type): boolean;
export declare function canBeMultiReturnType(type: ts.Type): boolean;
export declare function isMultiFunctionCall(context: TransformationContext, expression: ts.CallExpression): boolean;
export declare function returnsMultiType(context: TransformationContext, node: ts.CallExpression): boolean;
export declare function isMultiReturnCall(context: TransformationContext, expression: ts.Expression): boolean;
export declare function isMultiFunctionNode(context: TransformationContext, node: ts.Node): boolean;
export declare function isInMultiReturnFunction(context: TransformationContext, node: ts.Node): boolean;
export declare function shouldMultiReturnCallBeWrapped(context: TransformationContext, node: ts.CallExpression): boolean;
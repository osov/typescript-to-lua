import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
export type BitOperator = ts.ShiftOperator | ts.BitwiseOperator;
export declare const isBitOperator: (operator: ts.BinaryOperator) => operator is BitOperator;
export declare function transformBinaryBitOperation(context: TransformationContext, node: ts.Node, left: lua.Expression, right: lua.Expression, operator: BitOperator): lua.Expression;
export declare function transformUnaryBitOperation(context: TransformationContext, node: ts.Node, expression: lua.Expression, operator: lua.UnaryBitwiseOperator): lua.Expression;

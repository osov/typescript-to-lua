import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
type CompoundAssignmentToken = ts.SyntaxKind.BarToken | ts.SyntaxKind.PlusToken | ts.SyntaxKind.CaretToken | ts.SyntaxKind.MinusToken | ts.SyntaxKind.SlashToken | ts.SyntaxKind.PercentToken | ts.SyntaxKind.AsteriskToken | ts.SyntaxKind.AmpersandToken | ts.SyntaxKind.AsteriskAsteriskToken | ts.SyntaxKind.LessThanLessThanToken | ts.SyntaxKind.GreaterThanGreaterThanToken | ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken | ts.SyntaxKind.BarBarToken | ts.SyntaxKind.AmpersandAmpersandToken | ts.SyntaxKind.QuestionQuestionToken;
export declare const isCompoundAssignmentToken: (token: ts.BinaryOperator) => token is ts.CompoundAssignmentOperator;
export declare const unwrapCompoundAssignmentToken: (token: ts.CompoundAssignmentOperator) => CompoundAssignmentToken;
export declare function transformCompoundAssignmentExpression(context: TransformationContext, expression: ts.Expression, lhs: ts.Expression, rhs: ts.Expression, operator: CompoundAssignmentToken, isPostfix: boolean): lua.Expression;
export declare function transformCompoundAssignmentStatement(context: TransformationContext, node: ts.Node, lhs: ts.Expression, rhs: ts.Expression, operator: CompoundAssignmentToken): lua.Statement[];
export {};

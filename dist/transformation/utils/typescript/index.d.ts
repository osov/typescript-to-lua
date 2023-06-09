import * as ts from "typescript";
import { TransformationContext } from "../../context";
export * from "./nodes";
export * from "./types";
export declare function hasExportEquals(sourceFile: ts.SourceFile): boolean;
/**
 * Search up until finding a node satisfying the callback
 */
export declare function findFirstNodeAbove<T extends ts.Node>(node: ts.Node, callback: (n: ts.Node) => n is T): T | undefined;
export declare function findFirstNonOuterParent(node: ts.Node): ts.Node;
export declare function expressionResultIsUsed(node: ts.Expression): boolean;
export declare function getFirstDeclarationInFile(symbol: ts.Symbol, sourceFile: ts.SourceFile): ts.Declaration | undefined;
export declare function isStandardLibraryDeclaration(context: TransformationContext, declaration: ts.Declaration): boolean;
export declare function isStandardLibraryType(context: TransformationContext, type: ts.Type, name: string | undefined): boolean;
export declare function hasStandardLibrarySignature(context: TransformationContext, callExpression: ts.CallExpression): boolean;
export declare function inferAssignedType(context: TransformationContext, expression: ts.Expression): ts.Type;
export declare function getAllCallSignatures(type: ts.Type): readonly ts.Signature[];
export declare function isExpressionWithEvaluationEffect(node: ts.Expression): boolean;
export declare function getFunctionTypeForCall(context: TransformationContext, node: ts.CallExpression): ts.Type | undefined;
export declare function isConstIdentifier(context: TransformationContext, node: ts.Node): boolean;

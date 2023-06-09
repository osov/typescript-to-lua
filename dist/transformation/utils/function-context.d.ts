import * as ts from "typescript";
import { TransformationContext } from "../context";
export declare enum ContextType {
    None = 0,
    Void = 1,
    NonVoid = 2,
    Mixed = 3
}
export declare function getDeclarationContextType(context: TransformationContext, signatureDeclaration: ts.SignatureDeclaration): ContextType;
export declare function getFunctionContextType(context: TransformationContext, type: ts.Type): ContextType;

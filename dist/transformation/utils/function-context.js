"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunctionContextType = exports.getDeclarationContextType = exports.ContextType = void 0;
const ts = require("typescript");
const annotations_1 = require("./annotations");
const typescript_1 = require("./typescript");
var ContextType;
(function (ContextType) {
    ContextType[ContextType["None"] = 0] = "None";
    ContextType[ContextType["Void"] = 1] = "Void";
    ContextType[ContextType["NonVoid"] = 2] = "NonVoid";
    ContextType[ContextType["Mixed"] = 3] = "Mixed";
})(ContextType = exports.ContextType || (exports.ContextType = {}));
function hasNoSelfAncestor(declaration) {
    const scopeDeclaration = (0, typescript_1.findFirstNodeAbove)(declaration, (node) => ts.isSourceFile(node) || ts.isModuleDeclaration(node));
    if (!scopeDeclaration) {
        return false;
    }
    else if (ts.isSourceFile(scopeDeclaration)) {
        return (0, annotations_1.getFileAnnotations)(scopeDeclaration).has(annotations_1.AnnotationKind.NoSelfInFile);
    }
    else if ((0, annotations_1.getNodeAnnotations)(scopeDeclaration).has(annotations_1.AnnotationKind.NoSelf)) {
        return true;
    }
    else {
        return hasNoSelfAncestor(scopeDeclaration);
    }
}
function getExplicitThisParameter(signatureDeclaration) {
    const param = signatureDeclaration.parameters[0];
    if (param && ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword) {
        return param;
    }
}
const signatureDeclarationContextTypes = new WeakMap();
function getDeclarationContextType(context, signatureDeclaration) {
    const known = signatureDeclarationContextTypes.get(signatureDeclaration);
    if (known !== undefined)
        return known;
    const contextType = computeDeclarationContextType(context, signatureDeclaration);
    signatureDeclarationContextTypes.set(signatureDeclaration, contextType);
    return contextType;
}
exports.getDeclarationContextType = getDeclarationContextType;
function computeDeclarationContextType(context, signatureDeclaration) {
    const thisParameter = getExplicitThisParameter(signatureDeclaration);
    if (thisParameter) {
        // Explicit 'this'
        return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
            ? ContextType.Void
            : ContextType.NonVoid;
    }
    // noSelf declaration on function signature
    if ((0, annotations_1.getNodeAnnotations)(signatureDeclaration).has(annotations_1.AnnotationKind.NoSelf)) {
        return ContextType.Void;
    }
    if (ts.isMethodSignature(signatureDeclaration) ||
        ts.isMethodDeclaration(signatureDeclaration) ||
        ts.isConstructSignatureDeclaration(signatureDeclaration) ||
        ts.isConstructorDeclaration(signatureDeclaration) ||
        (signatureDeclaration.parent && ts.isPropertyDeclaration(signatureDeclaration.parent)) ||
        (signatureDeclaration.parent && ts.isPropertySignature(signatureDeclaration.parent))) {
        // Class/interface methods only respect @noSelf on their parent
        const scopeDeclaration = (0, typescript_1.findFirstNodeAbove)(signatureDeclaration, (n) => ts.isClassDeclaration(n) || ts.isClassExpression(n) || ts.isInterfaceDeclaration(n));
        if (scopeDeclaration !== undefined && (0, annotations_1.getNodeAnnotations)(scopeDeclaration).has(annotations_1.AnnotationKind.NoSelf)) {
            return ContextType.Void;
        }
        return ContextType.NonVoid;
    }
    // When using --noImplicitSelf and the signature is defined in a file targeted by the program apply the @noSelf rule.
    const program = context.program;
    const options = program.getCompilerOptions();
    if (options.noImplicitSelf) {
        const sourceFile = program.getSourceFile(signatureDeclaration.getSourceFile().fileName);
        if (sourceFile !== undefined &&
            !program.isSourceFileDefaultLibrary(sourceFile) &&
            !program.isSourceFileFromExternalLibrary(sourceFile)) {
            return ContextType.Void;
        }
    }
    // Walk up to find @noSelf or @noSelfInFile
    if (hasNoSelfAncestor(signatureDeclaration)) {
        return ContextType.Void;
    }
    return ContextType.NonVoid;
}
function reduceContextTypes(contexts) {
    let type = ContextType.None;
    for (const context of contexts) {
        type |= context;
        if (type === ContextType.Mixed)
            break;
    }
    return type;
}
function getSignatureDeclarations(context, signature) {
    if (signature.compositeSignatures) {
        return signature.compositeSignatures.flatMap(s => getSignatureDeclarations(context, s));
    }
    const signatureDeclaration = signature.getDeclaration();
    if (signatureDeclaration === undefined) {
        return [];
    }
    let inferredType;
    if (ts.isMethodDeclaration(signatureDeclaration) &&
        ts.isObjectLiteralExpression(signatureDeclaration.parent) &&
        !getExplicitThisParameter(signatureDeclaration)) {
        inferredType = context.checker.getContextualTypeForObjectLiteralElement(signatureDeclaration);
    }
    else if ((ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration)) &&
        !getExplicitThisParameter(signatureDeclaration)) {
        // Infer type of function expressions/arrow functions
        inferredType = (0, typescript_1.inferAssignedType)(context, signatureDeclaration);
    }
    if (inferredType) {
        const inferredSignatures = (0, typescript_1.getAllCallSignatures)(inferredType);
        if (inferredSignatures.length > 0) {
            return inferredSignatures.map(s => s.getDeclaration());
        }
    }
    return [signatureDeclaration];
}
const typeContextTypes = new WeakMap();
function getFunctionContextType(context, type) {
    const known = typeContextTypes.get(type);
    if (known !== undefined)
        return known;
    const contextType = computeFunctionContextType(context, type);
    typeContextTypes.set(type, contextType);
    return contextType;
}
exports.getFunctionContextType = getFunctionContextType;
function computeFunctionContextType(context, type) {
    if (type.isTypeParameter()) {
        const constraint = type.getConstraint();
        if (constraint)
            return getFunctionContextType(context, constraint);
    }
    const signatures = context.checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (signatures.length === 0) {
        return ContextType.None;
    }
    return reduceContextTypes(signatures.flatMap(s => getSignatureDeclarations(context, s)).map(s => getDeclarationContextType(context, s)));
}
//# sourceMappingURL=function-context.js.map
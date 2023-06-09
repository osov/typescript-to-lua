"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripParenthesisExpressionsTransformer = exports.noImplicitSelfTransformer = exports.getTransformers = void 0;
const ts = require("typescript");
// TODO: Don't depend on CLI?
const cliDiagnostics = require("../cli/diagnostics");
const diagnosticFactories = require("./diagnostics");
const utils_1 = require("./utils");
function getTransformers(program, diagnostics, customTransformers, onSourceFile) {
    var _a, _b, _c, _d, _e, _f;
    const luaTransformer = () => sourceFile => {
        onSourceFile(sourceFile);
        return ts.createSourceFile(sourceFile.fileName, "", ts.ScriptTarget.ESNext);
    };
    const transformersFromOptions = loadTransformersFromOptions(program, diagnostics);
    const afterDeclarations = [
        ...((_a = transformersFromOptions.afterDeclarations) !== null && _a !== void 0 ? _a : []),
        ...((_b = customTransformers.afterDeclarations) !== null && _b !== void 0 ? _b : []),
    ];
    const options = program.getCompilerOptions();
    if (options.noImplicitSelf) {
        afterDeclarations.unshift(exports.noImplicitSelfTransformer);
    }
    return {
        afterDeclarations,
        before: [
            ...((_c = customTransformers.before) !== null && _c !== void 0 ? _c : []),
            ...((_d = transformersFromOptions.before) !== null && _d !== void 0 ? _d : []),
            ...((_e = transformersFromOptions.after) !== null && _e !== void 0 ? _e : []),
            ...((_f = customTransformers.after) !== null && _f !== void 0 ? _f : []),
            exports.stripParenthesisExpressionsTransformer,
            luaTransformer,
        ],
    };
}
exports.getTransformers = getTransformers;
const noImplicitSelfTransformer = () => node => {
    const transformSourceFile = node => {
        const empty = ts.factory.createNotEmittedStatement(undefined);
        ts.addSyntheticLeadingComment(empty, ts.SyntaxKind.MultiLineCommentTrivia, "* @noSelfInFile ", true);
        return ts.factory.updateSourceFile(node, [empty, ...node.statements], node.isDeclarationFile);
    };
    return ts.isBundle(node)
        ? ts.factory.updateBundle(node, node.sourceFiles.map(transformSourceFile))
        : transformSourceFile(node);
};
exports.noImplicitSelfTransformer = noImplicitSelfTransformer;
const stripParenthesisExpressionsTransformer = context => sourceFile => {
    // Remove parenthesis expressions before transforming to Lua, so transpiler is not hindered by extra ParenthesizedExpression nodes
    function unwrapParentheses(node) {
        while (ts.isParenthesizedExpression(node) && !ts.isOptionalChain(node.expression)) {
            node = node.expression;
        }
        return node;
    }
    function visit(node) {
        // For now only call expressions strip their expressions of parentheses, there could be more cases where this is required
        if (ts.isCallExpression(node)) {
            return ts.factory.updateCallExpression(node, unwrapParentheses(node.expression), node.typeArguments, node.arguments);
        }
        else if (ts.isVoidExpression(node)) {
            return ts.factory.updateVoidExpression(node, unwrapParentheses(node.expression));
        }
        else if (ts.isDeleteExpression(node)) {
            return ts.factory.updateDeleteExpression(node, unwrapParentheses(node.expression));
        }
        return ts.visitEachChild(node, visit, context);
    }
    return ts.visitEachChild(sourceFile, visit, context);
};
exports.stripParenthesisExpressionsTransformer = stripParenthesisExpressionsTransformer;
function loadTransformersFromOptions(program, diagnostics) {
    const customTransformers = {
        before: [],
        after: [],
        afterDeclarations: [],
    };
    const options = program.getCompilerOptions();
    if (options.plugins) {
        for (const [index, transformerImport] of options.plugins.entries()) {
            if (!("transform" in transformerImport))
                continue;
            const optionName = `compilerOptions.plugins[${index}]`;
            const { error: resolveError, result: factory } = (0, utils_1.resolvePlugin)("transformer", `${optionName}.transform`, (0, utils_1.getConfigDirectory)(options), transformerImport.transform, transformerImport.import);
            if (resolveError)
                diagnostics.push(resolveError);
            if (factory === undefined)
                continue;
            const { error: loadError, transformer } = loadTransformer(optionName, program, factory, transformerImport);
            if (loadError)
                diagnostics.push(loadError);
            if (transformer === undefined)
                continue;
            if (transformer.before) {
                customTransformers.before.push(transformer.before);
            }
            if (transformer.after) {
                customTransformers.after.push(transformer.after);
            }
            if (transformer.afterDeclarations) {
                customTransformers.afterDeclarations.push(transformer.afterDeclarations);
            }
        }
    }
    if (options.jsx === ts.JsxEmit.React) {
        customTransformers.before.push(context => {
            // if target < ES2017, typescript generates some unnecessary additional transformations in transformJSX.
            // We can't control the target compiler option, so we override here.
            const patchedContext = {
                ...context,
                getCompilerOptions: () => ({
                    ...context.getCompilerOptions(),
                    target: ts.ScriptTarget.ESNext,
                }),
            };
            return ts.transformJsx(patchedContext);
        });
    }
    return customTransformers;
}
function loadTransformer(optionPath, program, factory, { transform, after = false, afterDeclarations = false, type = "program", ...extraOptions }) {
    var _a, _b;
    let transformer;
    switch (type) {
        case "program":
            transformer = factory(program, extraOptions);
            break;
        case "config":
            transformer = factory(extraOptions);
            break;
        case "checker":
            transformer = factory(program.getTypeChecker(), extraOptions);
            break;
        case "raw":
            transformer = factory;
            break;
        case "compilerOptions":
            transformer = factory(program.getCompilerOptions(), extraOptions);
            break;
        default: {
            const optionName = `--${optionPath}.type`;
            return { error: cliDiagnostics.argumentForOptionMustBe(optionName, "program") };
        }
    }
    if (typeof after !== "boolean") {
        const optionName = `${optionPath}.after`;
        return { error: cliDiagnostics.compilerOptionRequiresAValueOfType(optionName, "boolean") };
    }
    if (typeof afterDeclarations !== "boolean") {
        const optionName = `${optionPath}.afterDeclarations`;
        return { error: cliDiagnostics.compilerOptionRequiresAValueOfType(optionName, "boolean") };
    }
    if (typeof transformer === "function") {
        let wrappedTransformer;
        if (after) {
            wrappedTransformer = { after: transformer };
        }
        else if (afterDeclarations) {
            wrappedTransformer = { afterDeclarations: transformer };
        }
        else {
            wrappedTransformer = { before: transformer };
        }
        return { transformer: wrappedTransformer };
    }
    else {
        const isValidGroupTransformer = typeof transformer === "object" &&
            ((_b = (_a = transformer.before) !== null && _a !== void 0 ? _a : transformer.after) !== null && _b !== void 0 ? _b : transformer.afterDeclarations) !== undefined;
        if (!isValidGroupTransformer) {
            return { error: diagnosticFactories.transformerShouldBeATsTransformerFactory(transform) };
        }
    }
    return { transformer };
}
//# sourceMappingURL=transformers.js.map
import * as ts from "typescript";
export declare const couldNotResolveRequire: ((requirePath: string, containingFile: string) => ts.Diagnostic) & {
    code: number;
};
export declare const couldNotReadDependency: ((dependency: string) => ts.Diagnostic) & {
    code: number;
};
export declare const toLoadItShouldBeTranspiled: ((kind: string, transform: string) => ts.Diagnostic) & {
    code: number;
};
export declare const couldNotResolveFrom: ((kind: string, transform: string, base: string) => ts.Diagnostic) & {
    code: number;
};
export declare const shouldHaveAExport: ((kind: string, transform: string, importName: string) => ts.Diagnostic) & {
    code: number;
};
export declare const transformerShouldBeATsTransformerFactory: ((transform: string) => ts.Diagnostic) & {
    code: number;
};
export declare const couldNotFindBundleEntryPoint: ((entryPoint: string) => ts.Diagnostic) & {
    code: number;
};
export declare const luaBundleEntryIsRequired: (() => ts.Diagnostic) & {
    code: number;
};
export declare const usingLuaBundleWithInlineMightGenerateDuplicateCode: (() => ts.Diagnostic) & {
    code: number;
};
export declare const cannotBundleLibrary: (() => ts.Diagnostic) & {
    code: number;
};
export declare const unsupportedJsxEmit: (() => ts.Diagnostic) & {
    code: number;
};
export declare const pathsWithoutBaseUrl: (() => ts.Diagnostic) & {
    code: number;
};

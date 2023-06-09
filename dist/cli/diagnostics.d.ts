import * as ts from "typescript";
export declare const tstlOptionsAreMovingToTheTstlObject: ((tstl: Record<string, any>) => ts.Diagnostic) & {
    code: number;
};
export declare const watchErrorSummary: (errorCount: number) => ts.Diagnostic;
export declare const unknownCompilerOption: ((name: string) => ts.Diagnostic) & {
    code: number;
};
export declare const compilerOptionRequiresAValueOfType: ((name: string, type: string) => ts.Diagnostic) & {
    code: number;
};
export declare const compilerOptionCouldNotParseJson: ((name: string, error: string) => ts.Diagnostic) & {
    code: number;
};
export declare const optionProjectCannotBeMixedWithSourceFilesOnACommandLine: (() => ts.Diagnostic) & {
    code: number;
};
export declare const cannotFindATsconfigJsonAtTheSpecifiedDirectory: ((dir: string) => ts.Diagnostic) & {
    code: number;
};
export declare const theSpecifiedPathDoesNotExist: ((dir: string) => ts.Diagnostic) & {
    code: number;
};
export declare const compilerOptionExpectsAnArgument: ((name: string) => ts.Diagnostic) & {
    code: number;
};
export declare const argumentForOptionMustBe: ((name: string, values: string) => ts.Diagnostic) & {
    code: number;
};
export declare const optionCanOnlyBeSpecifiedInTsconfigJsonFile: ((name: string) => ts.Diagnostic) & {
    code: number;
};
export declare const optionBuildMustBeFirstCommandLineArgument: (() => ts.Diagnostic) & {
    code: number;
};

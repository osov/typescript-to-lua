import * as ts from "typescript";
export declare function castArray<T>(value: T | T[]): T[];
export declare function castArray<T>(value: T | readonly T[]): readonly T[];
export declare const intersperse: <T>(values: readonly T[], separator: T) => T[];
export declare const union: <T>(...values: Iterable<T>[]) => T[];
export declare const intersection: <T>(first: readonly T[], ...rest: (readonly T[])[]) => T[];
type DiagnosticFactory = (...args: any) => Partial<ts.Diagnostic> & Pick<ts.Diagnostic, "messageText">;
export declare const createDiagnosticFactoryWithCode: <T extends DiagnosticFactory>(code: number, create: T) => ((...args: Parameters<T>) => ts.Diagnostic) & {
    code: number;
};
export declare const createSerialDiagnosticFactory: <T extends DiagnosticFactory>(create: T) => ((...args: Parameters<T>) => ts.Diagnostic) & {
    code: number;
};
export declare const normalizeSlashes: (filePath: string) => string;
export declare const trimExtension: (filePath: string) => string;
export declare function formatPathToLuaPath(filePath: string): string;
type NoInfer<T> = [T][T extends any ? 0 : never];
export declare function getOrUpdate<K, V>(map: Map<K, V> | (K extends object ? WeakMap<K, V> : never), key: K, getDefaultValue: () => NoInfer<V>): V;
export declare function isNonNull<T>(value: T | null | undefined): value is T;
export declare function cast<TOriginal, TCast extends TOriginal>(item: TOriginal, cast: (item: TOriginal) => item is TCast): TCast;
export declare function assert(value: any, message?: string | Error): asserts value;
export declare function assertNever(_value: never): never;
export declare function assume<T>(_value: any): asserts _value is T;
export {};

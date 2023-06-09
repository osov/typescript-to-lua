import * as ts from "typescript";
export interface TranspiledFile {
    outPath: string;
    sourceFiles: ts.SourceFile[];
    lua?: string;
    luaSourceMap?: string;
    declaration?: string;
    declarationMap?: string;
}
export declare function createEmitOutputCollector(luaExtension?: string): {
    writeFile: ts.WriteFileCallback;
    files: TranspiledFile[];
};

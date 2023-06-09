import * as tstl from "..";
export declare function isExportTableDeclaration(node: tstl.Node): node is tstl.VariableDeclarationStatement & {
    left: [];
};
export declare function isExportTable(node: tstl.Node): node is tstl.Identifier;
export type ExportTableIndex = tstl.TableIndexExpression & {
    index: tstl.StringLiteral;
};
export declare function isExportTableIndex(node: tstl.Node): node is ExportTableIndex;
export declare function isExportAlias(node: tstl.Node): node is tstl.VariableDeclarationStatement & {
    right: [ExportTableIndex];
};
export type ExportAssignment = tstl.AssignmentStatement & {
    left: [ExportTableIndex];
};
export declare function isExportAssignment(node: tstl.Node): node is ExportAssignment;
export declare function isRequire(node: tstl.Node): boolean | undefined;
export declare function isImport(node: tstl.Node, importNames: Set<string>): boolean;
export declare function isExportsReturn(node: tstl.Node): boolean;

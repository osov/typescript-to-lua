import * as ts from "typescript";
import { LuaLibFeature } from "./LuaLib";
export declare enum SyntaxKind {
    File = 0,
    Block = 1,
    DoStatement = 2,
    VariableDeclarationStatement = 3,
    AssignmentStatement = 4,
    IfStatement = 5,
    WhileStatement = 6,
    RepeatStatement = 7,
    ForStatement = 8,
    ForInStatement = 9,
    GotoStatement = 10,
    LabelStatement = 11,
    ReturnStatement = 12,
    BreakStatement = 13,
    ExpressionStatement = 14,
    StringLiteral = 15,
    NumericLiteral = 16,
    NilKeyword = 17,
    DotsKeyword = 18,
    ArgKeyword = 19,
    TrueKeyword = 20,
    FalseKeyword = 21,
    FunctionExpression = 22,
    TableFieldExpression = 23,
    TableExpression = 24,
    UnaryExpression = 25,
    BinaryExpression = 26,
    CallExpression = 27,
    MethodCallExpression = 28,
    Identifier = 29,
    TableIndexExpression = 30,
    AdditionOperator = 31,
    SubtractionOperator = 32,
    MultiplicationOperator = 33,
    DivisionOperator = 34,
    FloorDivisionOperator = 35,
    ModuloOperator = 36,
    PowerOperator = 37,
    NegationOperator = 38,
    ConcatOperator = 39,
    LengthOperator = 40,
    EqualityOperator = 41,
    InequalityOperator = 42,
    LessThanOperator = 43,
    LessEqualOperator = 44,
    GreaterThanOperator = 45,
    GreaterEqualOperator = 46,
    AndOperator = 47,
    OrOperator = 48,
    NotOperator = 49,
    BitwiseAndOperator = 50,
    BitwiseOrOperator = 51,
    BitwiseExclusiveOrOperator = 52,
    BitwiseRightShiftOperator = 53,
    BitwiseLeftShiftOperator = 54,
    BitwiseNotOperator = 55
}
export type UnaryBitwiseOperator = SyntaxKind.BitwiseNotOperator;
export type UnaryOperator = SyntaxKind.NegationOperator | SyntaxKind.LengthOperator | SyntaxKind.NotOperator | UnaryBitwiseOperator;
export type BinaryBitwiseOperator = SyntaxKind.BitwiseAndOperator | SyntaxKind.BitwiseOrOperator | SyntaxKind.BitwiseExclusiveOrOperator | SyntaxKind.BitwiseRightShiftOperator | SyntaxKind.BitwiseLeftShiftOperator;
export type BinaryOperator = SyntaxKind.AdditionOperator | SyntaxKind.SubtractionOperator | SyntaxKind.MultiplicationOperator | SyntaxKind.DivisionOperator | SyntaxKind.FloorDivisionOperator | SyntaxKind.ModuloOperator | SyntaxKind.PowerOperator | SyntaxKind.ConcatOperator | SyntaxKind.EqualityOperator | SyntaxKind.InequalityOperator | SyntaxKind.LessThanOperator | SyntaxKind.LessEqualOperator | SyntaxKind.GreaterThanOperator | SyntaxKind.GreaterEqualOperator | SyntaxKind.AndOperator | SyntaxKind.OrOperator | BinaryBitwiseOperator;
export type Operator = UnaryOperator | BinaryOperator;
export type SymbolId = number & {
    _symbolIdBrand: any;
};
export declare enum NodeFlags {
    None = 0,
    Inline = 1,
    Declaration = 2,
    TableUnpackCall = 4
}
export interface TextRange {
    line?: number;
    column?: number;
}
export interface Node extends TextRange {
    kind: SyntaxKind;
    flags: NodeFlags;
}
export declare function createNode(kind: SyntaxKind, tsOriginal?: ts.Node): Node;
export declare function cloneNode<T extends Node>(node: T): T;
export declare function setNodePosition<T extends Node>(node: T, position: TextRange): T;
export declare function setNodeOriginal<T extends Node>(node: T, tsOriginal: ts.Node): T;
export declare function setNodeOriginal<T extends Node>(node: T | undefined, tsOriginal: ts.Node): T | undefined;
export declare function getOriginalPos(node: Node): TextRange;
export declare function setNodeFlags<T extends Node>(node: T, flags: NodeFlags): T;
export interface File extends Node {
    kind: SyntaxKind.File;
    statements: Statement[];
    luaLibFeatures: Set<LuaLibFeature>;
    trivia: string;
}
export declare function isFile(node: Node): node is File;
export declare function createFile(statements: Statement[], luaLibFeatures: Set<LuaLibFeature>, trivia: string, tsOriginal?: ts.Node): File;
export interface Block extends Node {
    kind: SyntaxKind.Block;
    statements: Statement[];
}
export declare function isBlock(node: Node): node is Block;
export declare function createBlock(statements: Statement[], tsOriginal?: ts.Node): Block;
export interface Statement extends Node {
    _statementBrand: any;
    leadingComments?: Array<string | string[]>;
    trailingComments?: Array<string | string[]>;
}
export interface DoStatement extends Statement {
    kind: SyntaxKind.DoStatement;
    statements: Statement[];
}
export declare function isDoStatement(node: Node): node is DoStatement;
export declare function createDoStatement(statements: Statement[], tsOriginal?: ts.Node): DoStatement;
export interface VariableDeclarationStatement extends Statement {
    kind: SyntaxKind.VariableDeclarationStatement;
    left: Identifier[];
    right?: Expression[];
}
export declare function isVariableDeclarationStatement(node: Node): node is VariableDeclarationStatement;
export declare function createVariableDeclarationStatement(left: Identifier | Identifier[], right?: Expression | Expression[], tsOriginal?: ts.Node): VariableDeclarationStatement;
export interface AssignmentStatement extends Statement {
    kind: SyntaxKind.AssignmentStatement;
    left: AssignmentLeftHandSideExpression[];
    right: Expression[];
}
export declare function isAssignmentStatement(node: Node): node is AssignmentStatement;
export declare function createAssignmentStatement(left: AssignmentLeftHandSideExpression | AssignmentLeftHandSideExpression[], right?: Expression | Expression[], tsOriginal?: ts.Node): AssignmentStatement;
export interface IfStatement extends Statement {
    kind: SyntaxKind.IfStatement;
    condition: Expression;
    ifBlock: Block;
    elseBlock?: Block | IfStatement;
}
export declare function isIfStatement(node: Node): node is IfStatement;
export declare function createIfStatement(condition: Expression, ifBlock: Block, elseBlock?: Block | IfStatement, tsOriginal?: ts.Node): IfStatement;
export interface IterationStatement extends Statement {
    body: Block;
}
export declare function isIterationStatement(node: Node): node is IterationStatement;
export interface WhileStatement extends IterationStatement {
    kind: SyntaxKind.WhileStatement;
    condition: Expression;
}
export declare function isWhileStatement(node: Node): node is WhileStatement;
export declare function createWhileStatement(body: Block, condition: Expression, tsOriginal?: ts.Node): WhileStatement;
export interface RepeatStatement extends IterationStatement {
    kind: SyntaxKind.RepeatStatement;
    condition: Expression;
}
export declare function isRepeatStatement(node: Node): node is RepeatStatement;
export declare function createRepeatStatement(body: Block, condition: Expression, tsOriginal?: ts.Node): RepeatStatement;
export interface ForStatement extends IterationStatement {
    kind: SyntaxKind.ForStatement;
    controlVariable: Identifier;
    controlVariableInitializer: Expression;
    limitExpression: Expression;
    stepExpression?: Expression;
}
export declare function isForStatement(node: Node): node is ForStatement;
export declare function createForStatement(body: Block, controlVariable: Identifier, controlVariableInitializer: Expression, limitExpression: Expression, stepExpression?: Expression, tsOriginal?: ts.Node): ForStatement;
export interface ForInStatement extends IterationStatement {
    kind: SyntaxKind.ForInStatement;
    names: Identifier[];
    expressions: Expression[];
}
export declare function isForInStatement(node: Node): node is ForInStatement;
export declare function createForInStatement(body: Block, names: Identifier[], expressions: Expression[], tsOriginal?: ts.Node): ForInStatement;
export interface GotoStatement extends Statement {
    kind: SyntaxKind.GotoStatement;
    label: string;
}
export declare function isGotoStatement(node: Node): node is GotoStatement;
export declare function createGotoStatement(label: string, tsOriginal?: ts.Node): GotoStatement;
export interface LabelStatement extends Statement {
    kind: SyntaxKind.LabelStatement;
    name: string;
}
export declare function isLabelStatement(node: Node): node is LabelStatement;
export declare function createLabelStatement(name: string, tsOriginal?: ts.Node): LabelStatement;
export interface ReturnStatement extends Statement {
    kind: SyntaxKind.ReturnStatement;
    expressions: Expression[];
}
export declare function isReturnStatement(node: Node): node is ReturnStatement;
export declare function createReturnStatement(expressions: Expression[], tsOriginal?: ts.Node): ReturnStatement;
export interface BreakStatement extends Statement {
    kind: SyntaxKind.BreakStatement;
}
export declare function isBreakStatement(node: Node): node is BreakStatement;
export declare function createBreakStatement(tsOriginal?: ts.Node): BreakStatement;
export interface ExpressionStatement extends Statement {
    kind: SyntaxKind.ExpressionStatement;
    expression: Expression;
}
export declare function isExpressionStatement(node: Node): node is ExpressionStatement;
export declare function createExpressionStatement(expressions: Expression, tsOriginal?: ts.Node): ExpressionStatement;
export interface Expression extends Node {
    _expressionBrand: any;
}
export interface NilLiteral extends Expression {
    kind: SyntaxKind.NilKeyword;
}
export declare function isNilLiteral(node: Node): node is NilLiteral;
export declare function createNilLiteral(tsOriginal?: ts.Node): NilLiteral;
export interface BooleanLiteral extends Expression {
    kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword;
}
export declare function isBooleanLiteral(node: Node): node is BooleanLiteral;
export declare function createBooleanLiteral(value: boolean, tsOriginal?: ts.Node): BooleanLiteral;
export interface DotsLiteral extends Expression {
    kind: SyntaxKind.DotsKeyword;
}
export declare function isDotsLiteral(node: Node): node is DotsLiteral;
export declare function createDotsLiteral(tsOriginal?: ts.Node): DotsLiteral;
export interface ArgLiteral extends Expression {
    kind: SyntaxKind.ArgKeyword;
}
export declare function isArgLiteral(node: Node): node is ArgLiteral;
export declare function createArgLiteral(tsOriginal?: ts.Node): ArgLiteral;
export interface NumericLiteral extends Expression {
    kind: SyntaxKind.NumericLiteral;
    value: number;
}
export declare function isNumericLiteral(node: Node): node is NumericLiteral;
export declare function createNumericLiteral(value: number, tsOriginal?: ts.Node): NumericLiteral;
export interface StringLiteral extends Expression {
    kind: SyntaxKind.StringLiteral;
    value: string;
}
export declare function isStringLiteral(node: Node): node is StringLiteral;
export declare function createStringLiteral(value: string, tsOriginal?: ts.Node): StringLiteral;
export declare function isLiteral(node: Node): node is NilLiteral | DotsLiteral | ArgLiteral | BooleanLiteral | NumericLiteral | StringLiteral;
export interface FunctionExpression extends Expression {
    kind: SyntaxKind.FunctionExpression;
    params?: Identifier[];
    dots?: DotsLiteral;
    body: Block;
}
export declare function isFunctionExpression(node: Node): node is FunctionExpression;
export declare function createFunctionExpression(body: Block, params?: Identifier[], dots?: DotsLiteral, flags?: NodeFlags, tsOriginal?: ts.Node): FunctionExpression;
export interface TableFieldExpression extends Expression {
    kind: SyntaxKind.TableFieldExpression;
    value: Expression;
    key?: Expression;
}
export declare function isTableFieldExpression(node: Node): node is TableFieldExpression;
export declare function createTableFieldExpression(value: Expression, key?: Expression, tsOriginal?: ts.Node): TableFieldExpression;
export interface TableExpression extends Expression {
    kind: SyntaxKind.TableExpression;
    fields: TableFieldExpression[];
}
export declare function isTableExpression(node: Node): node is TableExpression;
export declare function createTableExpression(fields?: TableFieldExpression[], tsOriginal?: ts.Node): TableExpression;
export interface UnaryExpression extends Expression {
    kind: SyntaxKind.UnaryExpression;
    operand: Expression;
    operator: UnaryOperator;
}
export declare function isUnaryExpression(node: Node): node is UnaryExpression;
export declare function createUnaryExpression(operand: Expression, operator: UnaryOperator, tsOriginal?: ts.Node): UnaryExpression;
export interface BinaryExpression extends Expression {
    kind: SyntaxKind.BinaryExpression;
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
}
export declare function isBinaryExpression(node: Node): node is BinaryExpression;
export declare function createBinaryExpression(left: Expression, right: Expression, operator: BinaryOperator, tsOriginal?: ts.Node): BinaryExpression;
export interface CallExpression extends Expression {
    kind: SyntaxKind.CallExpression;
    expression: Expression;
    params: Expression[];
}
export declare function isCallExpression(node: Node): node is CallExpression;
export declare function createCallExpression(expression: Expression, params: Expression[], tsOriginal?: ts.Node): CallExpression;
export interface MethodCallExpression extends Expression {
    kind: SyntaxKind.MethodCallExpression;
    prefixExpression: Expression;
    name: Identifier;
    params: Expression[];
}
export declare function isMethodCallExpression(node: Node): node is MethodCallExpression;
export declare function createMethodCallExpression(prefixExpression: Expression, name: Identifier, params: Expression[], tsOriginal?: ts.Node): MethodCallExpression;
export interface Identifier extends Expression {
    kind: SyntaxKind.Identifier;
    exportable: boolean;
    text: string;
    originalName?: string;
    symbolId?: SymbolId;
}
export declare function isIdentifier(node: Node): node is Identifier;
export declare function createIdentifier(text: string, tsOriginal?: ts.Node, symbolId?: SymbolId, originalName?: string): Identifier;
export declare function cloneIdentifier(identifier: Identifier, tsOriginal?: ts.Node): Identifier;
export declare function createAnonymousIdentifier(tsOriginal?: ts.Node): Identifier;
export interface TableIndexExpression extends Expression {
    kind: SyntaxKind.TableIndexExpression;
    table: Expression;
    index: Expression;
}
export declare function isTableIndexExpression(node: Node): node is TableIndexExpression;
export declare function createTableIndexExpression(table: Expression, index: Expression, tsOriginal?: ts.Node): TableIndexExpression;
export type AssignmentLeftHandSideExpression = Identifier | TableIndexExpression;
export declare function isAssignmentLeftHandSideExpression(node: Node): node is AssignmentLeftHandSideExpression;
export type FunctionDefinition = (VariableDeclarationStatement | AssignmentStatement) & {
    right: [FunctionExpression];
};
export declare function isFunctionDefinition(statement: VariableDeclarationStatement | AssignmentStatement): statement is FunctionDefinition;
export type InlineFunctionExpression = FunctionExpression & {
    body: {
        statements: [ReturnStatement & {
            expressions: Expression[];
        }];
    };
};
export declare function isInlineFunctionExpression(expression: FunctionExpression): expression is InlineFunctionExpression;

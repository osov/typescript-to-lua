import * as ts from "typescript";
import { CompilerOptions } from "../CompilerOptions";
export interface ParsedCommandLine extends ts.ParsedCommandLine {
    options: CompilerOptions;
}
interface CommandLineOptionBase {
    name: string;
    aliases?: string[];
    description: string;
}
interface CommandLineOptionOfEnum extends CommandLineOptionBase {
    type: "enum";
    choices: string[];
}
interface CommandLineOptionOfPrimitive extends CommandLineOptionBase {
    type: "boolean" | "string" | "json-array-of-objects" | "array";
}
type CommandLineOption = CommandLineOptionOfEnum | CommandLineOptionOfPrimitive;
export declare const optionDeclarations: CommandLineOption[];
export declare function updateParsedConfigFile(parsedConfigFile: ts.ParsedCommandLine): ParsedCommandLine;
export declare function parseCommandLine(args: string[]): ParsedCommandLine;
export {};

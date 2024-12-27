import exp from "node:constants";
import { InterfaceDeclaration, TypeAliasDeclaration } from "ts-morph";

export interface InputArguments {
    updateMode: UpdateMode;
    outputDirectory: string | undefined;
    files: string;
}

export interface Options {
    interactive: boolean;
}

export type UpdateMode = 'overwrite' | 'merge'

export type TypingDeclaration = InterfaceDeclaration | TypeAliasDeclaration
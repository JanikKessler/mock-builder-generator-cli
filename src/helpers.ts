import {ClassDeclaration, PropertySignature, ReferencedSymbol, ts, Type, Symbol} from "ts-morph";
import * as changeCase from "change-case-all";
import {faker} from "@faker-js/faker";
import {isPropertySignature} from "./typeGuards";

export function getSubTypeName(subType: string){
    return subType.split('.').pop();
}

export function determinePrefix(propType: Type, prop: PropertySignature) {
    const prefix = propType.isBoolean() ? `is` : "with";
    return prefix + changeCase.pascalCase(prop.getName());
}

export function erasePrefixFromMethod(methodName: string): string {
    return changeCase.camelCase(methodName.replace(/^with|is/, ''));
}

export function getFakeValue(propType: Type): string{
    if (propType.isArray()) {
        return "[]"
    } else if (propType.isString()) {
        return `"${faker.string.alpha()}"`;
    } else if (propType.isNumber()) {
        return `${faker.number.int()}`;
    } else if (propType.isBoolean()) {
        return `${faker.datatype.boolean()}`;
    } else if (propType.getText() === "Date") {
        return `new Date()`;
    } else {
        return 'null';
    }
}


export function isNotBuiltInType(type: Type) {
    const typeText = type.getText();

    const builtInTypes = [
        "string", "number", "boolean", "bigint", "symbol", "undefined", "null",
        "Date", "RegExp", "object", "any"
    ];

    return !builtInTypes.includes(typeText);
}

export function determinePropType(prop: any, builderClass: ClassDeclaration){
    if(prop.getType == undefined){
        return prop.getTypeAtLocation(builderClass);
    } else {
        return prop.getType()
    }
}

export function determineIsOptional(prop: any){
    if(prop.getType == undefined){
        return prop.getDeclarations().some((decl) => {
            if (decl.getKindName() === "PropertySignature" || decl.getKindName() === "PropertyDeclaration") {
                return decl.asKindOrThrow(ts.SyntaxKind.PropertySignature).hasQuestionToken();
            }
            return false;
        });
    } else {
        return prop.hasQuestionToken()
    }
}

export function getNestedTypeDeclaration(prop: PropertySignature | Symbol ): string {
    if(isPropertySignature(prop)){
        const name = prop.getText().split(': ').pop()
        return name.endsWith(';') ? name.slice(0, -1) : name;
    } else {
        const name = prop.getValueDeclarationOrThrow().getText().split(': ').pop()
        return name.endsWith(';') ? name.slice(0, -1) : name;
    }
}

export function getNestedTypeName(prop: PropertySignature | Symbol ): string {

        if(isPropertySignature(prop)){
            const name = prop.getText().match(/components\["schemas"\]\["([^"]+)"\]/)
            if(name !== null) {
                return name[1];
            } else {
                const name = prop.getText().split(': ').pop()
                return name.endsWith(';') ? name.slice(0, -1) : name;
            }
        } else {
            const name = prop.getValueDeclarationOrThrow().getText().match(/components\["schemas"\]\["([^"]+)"\]/)
            if(name !== null) {
                return name[1];
            } else {
                const name = prop.getValueDeclarationOrThrow().getText().split(': ').pop()
                return name.endsWith(';') ? name.slice(0, -1) : name;
            }
        }
}
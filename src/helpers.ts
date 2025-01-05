import {ClassDeclaration, PropertySignature, ReferencedSymbol, Node, ts, Type, Symbol, TypeNode} from "ts-morph";
import * as changeCase from "change-case-all";
import {faker} from "@faker-js/faker";
import {isPropertySignature} from "./typeGuards";

export function getSubTypeName(subType: string) {
    return subType.split('.').pop();
}

export function determinePrefix(propType: Type, prop: PropertySignature) {
    const prefix = propType.isBoolean() ? `is` : "with";
    return prefix + changeCase.pascalCase(prop.getName());
}

export function erasePrefixFromMethod(methodName: string): string {
    return changeCase.camelCase(methodName.replace(/^with|is/, ''));
}

export function getFakeValue(propType: Type): string {
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

export function determinePropType(prop: any, builderClass: ClassDeclaration) {
    if (prop.getType == undefined) {
        return prop.getTypeAtLocation(builderClass);
    } else {
        return prop.getType()
    }
}

export function determineIsOptional(prop: any) {
    if (prop.getType == undefined) {
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

export function getNestedTypeDeclaration(prop: PropertySignature | Symbol, skipArrayType = false): string {
    const rawTypeText = extractRawTypeText(prop);
    if (!rawTypeText) return '';

    return cleanTypeText(rawTypeText, skipArrayType);
}

/**
 * Extracts the raw type text from either a PropertySignature or Symbol
 */
function extractRawTypeText(prop: PropertySignature | Symbol): string {
    if (isPropertySignature(prop)) {
        const typeNode = prop.getTypeNode();
        if (typeNode) {
            return getTypeTextFromNode(typeNode);
        }
        return prop.getText().split(': ').pop() || '';
    } else {
        const declaration = prop.getValueDeclarationOrThrow();
        return declaration.getText().split(': ').pop() || '';
    }
}

/**
 * Gets type text from a TypeNode, handling array types specially
 */
function getTypeTextFromNode(typeNode: TypeNode): string {
    if (Node.isArrayTypeNode(typeNode)) {
        return `${getTypeTextFromNode(typeNode.getElementTypeNode())}[]`;
    }
    return typeNode.getText();
}

/**
 * Cleans the type text by removing trailing semicolons and handling array notations
 */
function cleanTypeText(typeText: string, skipArray: boolean): string {
    let cleanedText = typeText.trim().replace(/;$/, '');

    if (skipArray && cleanedText.endsWith('[]')) {
        const arrayDimensions = cleanedText.match(/\[\]/g)?.length || 0;
        cleanedText = cleanedText.replace(/\[\]/g, '');
        if (arrayDimensions > 1) {
            cleanedText += '[]'.repeat(arrayDimensions - 1);
        }
    }

    return cleanedText;
}

export function getNestedTypeName(prop: PropertySignature | Symbol): string {

    if (isPropertySignature(prop)) {
        const name = prop.getText().match(/components\["schemas"\]\["([^"]+)"\]/)
        if (name !== null) {
            return name[1];
        } else {
            const name = prop.getText().split(': ').pop()
            return name.endsWith(';') ? name.slice(0, -1) : name;
        }
    } else {
        const name = prop.getValueDeclarationOrThrow().getText().match(/components\["schemas"\]\["([^"]+)"\]/)
        if (name !== null) {
            return name[1];
        } else {
            const name = prop.getValueDeclarationOrThrow().getText().split(': ').pop()
            return name.endsWith(';') ? name.slice(0, -1) : name;
        }
    }
}
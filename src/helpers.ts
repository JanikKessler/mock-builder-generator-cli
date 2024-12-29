import {ClassDeclaration, PropertyDeclaration, PropertySignature, Type} from "ts-morph";
import * as changeCase from "change-case-all";
import {faker} from "@faker-js/faker";

export function getSubTypeName(subType: string){
    return subType.split('.').pop();
}

export function determinePrefix(prop: PropertySignature) {
    const prefix = prop.getType().isBoolean() ? `is` : "with";
    return prefix + changeCase.pascalCase(prop.getName());
}

export function erasePrefixFromMethod(methodName: string): string {
    return changeCase.camelCase(methodName.replace(/^with|is/, ''));
}

export function getFakeValue(prop: PropertySignature | PropertyDeclaration): string{
    if (prop.getType().isString()) {
        return `"${faker.string.alpha()}"`;
    } else if (prop.getType().isNumber()) {
        return `${faker.number.int()}`;
    } else if (prop.getType().isBoolean()) {
        return `${faker.datatype.boolean()}`;
    } else if (prop.getType().getText() === "Date") {
        return `new Date()`;
    } else {
        return 'null';
    }
}


export function isNotBuiltInType(type: Type) {
    const typeText = type.getText();


    const builtInTypes = [
        "string", "number", "boolean", "bigint", "symbol", "undefined", "null",
        "Date", "RegExp", "Array", "object", "any"
    ];

    if (type.isArray()) {
        return false;
    }

    return !builtInTypes.includes(typeText);
}

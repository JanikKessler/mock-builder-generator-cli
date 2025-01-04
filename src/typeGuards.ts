import {
    InterfaceDeclaration,
    Node,
    PropertySignature,
    ts,
    TypeAliasDeclaration,
    TypeLiteralNode,
    TypeNode,
    Symbol
} from "ts-morph";

export function isInterfaceDeclaration(interfaceOrType: InterfaceDeclaration | TypeAliasDeclaration): interfaceOrType is InterfaceDeclaration {
    return Node.isInterfaceDeclaration(interfaceOrType)
}

export function isTypeAliasDeclaration(typeAlias: InterfaceDeclaration | TypeAliasDeclaration): typeAlias is TypeAliasDeclaration {
    return Node.isTypeAliasDeclaration(typeAlias);

}


export function isPropertySignature(input: Symbol | PropertySignature): input is PropertySignature {
    return input instanceof PropertySignature;
}
export function isTypeLiteralNode(type: TypeNode): type is TypeLiteralNode {
    return !!Node.isTypeLiteral(type);
}


import {InterfaceDeclaration, Node, TypeAliasDeclaration, TypeLiteralNode, TypeNode} from "ts-morph";

export function isInterfaceDeclaration(interfaceOrType: InterfaceDeclaration | TypeAliasDeclaration) : interfaceOrType is InterfaceDeclaration {
    return Node.isInterfaceDeclaration(interfaceOrType)
}

export function isTypeLiteralNode (type: TypeNode): type is TypeLiteralNode {
    return !!Node.isTypeLiteral(type);
}


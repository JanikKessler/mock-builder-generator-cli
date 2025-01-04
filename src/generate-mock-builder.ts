import {
    ClassDeclaration,
    InterfaceDeclaration,
    Project, PropertySignatureStructure, Scope,
    SourceFile,
    StructureKind,
    Type,
    TypeLiteralNode
} from "ts-morph";
import {
    determineIsOptional,
    determinePrefix,
    determinePropType,
    erasePrefixFromMethod,
    getFakeValue, getNestedTypeDeclaration, getNestedTypeName,
    getSubTypeName,
    isNotBuiltInType
} from "./helpers";
import {InputArguments, NestedType, TypingDeclaration} from "./model";
import {isInterfaceDeclaration, isTypeAliasDeclaration, isTypeLiteralNode} from "./typeGuards";

export async function generateMock(project: Project, sourceFile: SourceFile, nestedTypesTempFile: SourceFile, typeName: string, args: InputArguments, typeDeclaration?: string) {
    console.log('generateMock started', typeName)
    const filePath = sourceFile.getFilePath();
    const baseInterface: TypingDeclaration = sourceFile.getInterface(typeName) ?? sourceFile.getTypeAlias(typeName);

    if (!baseInterface) {
        console.error(`Type or Interface "${typeName}" not found in file ${filePath}`);
        process.exit(1);
    }


    const outputFilePath = `${sourceFile.getDirectoryPath()}/${typeName}Builder.ts`;

    const outputFile = generateOutputFile(project, args.outputDirectory ? `${args.outputDirectory}/${typeName}Builder.ts` : outputFilePath);
    const oldBuilderObject = outputFile.getClass(`${typeName}Builder`);

    const {nestedTypes} = await generateMockBuilder(outputFile, baseInterface, nestedTypesTempFile, typeDeclaration, oldBuilderObject)
    for (const nestedType of nestedTypes){
        console.log(nestedType)
        await generateMock(project, nestedType.interfaceDeclaration.getSourceFile(), nestedTypesTempFile, nestedType.interfaceDeclaration.getName(), args, nestedType.typeDeclaration);
    }

    await outputFile.fixMissingImports();
    await outputFile.formatText();
    await outputFile.save();
    console.log('generateMock ended', typeName);



}

async function generateMockBuilder(outputFile: SourceFile, typeObject: TypingDeclaration, nestedTypesTempFile: SourceFile, typeDeclaration?: string, oldBuilderObject?: ClassDeclaration): Promise<{
    nestedTypes: NestedType[]
}> {
    //remove existing builder if present
    if (oldBuilderObject !== undefined) {
        oldBuilderObject.remove()
    }

    const typeName = typeObject.getName();
    const newBuilderClass = outputFile.addClass({
        name: `${typeName}Builder`,
        isExported: true,
    })
    const nestedTypes = await processMockBuilder(typeObject, newBuilderClass, nestedTypesTempFile, buildMockBuilder, typeDeclaration)
    console.log(`CREATED Mock builder at: ${newBuilderClass.getSourceFile().getFilePath()}`);
    return nestedTypes;
}

async function mergeMockBuilder(oldBuilderObject: ClassDeclaration, typeObject: TypingDeclaration, nestedTypesTempFile: SourceFile): Promise<{
    nestedTypes: NestedType[]
}> {
    console.log(`UPDATED Mock builder generated at: ${oldBuilderObject.getSourceFile().getFilePath()}`);
    return await processMockBuilder(typeObject, oldBuilderObject, nestedTypesTempFile, mergingMockBuilder)
}

async function processMockBuilder(
    typeObject: TypingDeclaration,
    builderObject: ClassDeclaration,
    nestedTypesTempFile: SourceFile,
    builderFunction: (
        typeName: string,
        typeObject: InterfaceDeclaration | Type,
        builderObject: ClassDeclaration,
        nestedTypesTempFile: SourceFile,
        typeDeclaration?: string
    ) => Promise<{ nestedTypes: NestedType[] }>,
    typeDeclaration?: string
): Promise<{ nestedTypes: NestedType[] }> {
    const typeName = typeObject.getName();

    if (isInterfaceDeclaration(typeObject)) {
        return await builderFunction(typeName, typeObject, builderObject, nestedTypesTempFile, typeDeclaration);
    } else if (isTypeAliasDeclaration(typeObject)) {
        const node = typeObject.getTypeNodeOrThrow();
        if (isTypeLiteralNode(node)) {
            return await builderFunction(typeName, node.getType(), builderObject, nestedTypesTempFile, typeDeclaration);
        }
        return await builderFunction(typeName, typeObject.getType().getApparentType(), builderObject, nestedTypesTempFile, typeDeclaration);
    }
    return {nestedTypes: []}
}

function generateOutputFile(project: Project, outputFilePath: string): SourceFile {
    const outputFile = project.getSourceFile(outputFilePath);
    return outputFile ?? project.createSourceFile(outputFilePath, undefined, {overwrite: true});
}

async function mergingMockBuilder(typeName: string,
                                  typeObject: InterfaceDeclaration | TypeLiteralNode,
                                  oldBuilderObject: ClassDeclaration,
                                  project: Project,
                                  typeDeclaration?: string) {
    const interfaceProperties = typeObject.getProperties().map(prop => prop.getName());
    const oldBuilderProperties = oldBuilderObject.getProperties().map(prop => prop.getName());
    if (!!oldBuilderObject.getDecorator('fixed')) return {nestedTypes: []};

    typeObject.getProperties().forEach((prop, index) => {
        let propType = determinePropType(prop, oldBuilderObject)
        if (oldBuilderObject.getProperty(prop.getName())) {
            const oldProp = oldBuilderObject.getProperty(prop.getName());
            const propFixed = !!oldProp.getDecorators().find(d => d.getName() === 'fixed');
            if (!propFixed) {
                oldProp.setType(getSubTypeName(propType.getText()));
                oldProp.setInitializer(getFakeValue(propType));
            }
        } else {
            oldBuilderObject.addProperty({
                name: prop.getName(),
                type: getSubTypeName(propType.getText()),
                initializer: getFakeValue(propType),
            }).setOrder(index);

            oldBuilderObject.addMethod(
                {
                    name: determinePrefix(propType, prop),
                    parameters: [{name: 'value', type: getSubTypeName(propType.getText())}],
                    returnType: `${typeName}Builder`,
                    statements: `this.${prop.getName()} = value
                    return this;`,
                }
            ).setOrder(typeObject.getProperties().length + index);
        }
    })

    oldBuilderObject.getProperties().forEach(prop => {
        if (!interfaceProperties.includes(prop.getName())) {
            prop.remove()
        }
    });


    oldBuilderObject.getMethods()
        .filter(method => method.getName() !== 'build')
        .forEach(method => {
            const methodName = method.getName();
            const interfaceProp = typeObject.getProperty(erasePrefixFromMethod(methodName));
            if (!interfaceProp) {
                method.remove();
            }
        });

    oldBuilderObject.getMethod('build').setBodyText(
        `return {
            ${typeObject.getProperties().map(prop => `${prop.getName()}: this.${prop.getName()}`).join(",\n")}
        }`
    )

    return {nestedTypes: []};
}

async function buildMockBuilder(typeName: string,
                                typeObject: InterfaceDeclaration | Type,
                                newBuilderClass: ClassDeclaration,
                                nestedTypesTempFile: SourceFile,
                                typeDeclaration?: string) {
    const nestedTypes: NestedType[] = []

    typeObject.getProperties().forEach(prop => {
        const originalPropType = determinePropType(prop, newBuilderClass)
        let propType = originalPropType.isArray() ? originalPropType.getArrayElementTypeOrThrow() : originalPropType
        if (isNotBuiltInType(propType) && propType !== null) {
            const newInterface = nestedTypesTempFile.addInterface({
                    name: getNestedTypeName(prop),
                    isExported: true,
                    properties: propType.getProperties().map((x): PropertySignatureStructure => ({
                        name: x.getName(),
                        kind: StructureKind.PropertySignature,
                        type: getNestedTypeDeclaration(x),
                    }))
                }
            )
            nestedTypesTempFile.save()
            nestedTypesTempFile.fixMissingImports()
            nestedTypes.push({
                typeDeclaration: getNestedTypeDeclaration(prop),
                interfaceDeclaration: newInterface
            });
        }
    });

    newBuilderClass.addProperties(
        typeObject.getProperties().map(prop => {
                let propType = determinePropType(prop, newBuilderClass)
                let isOptional = determineIsOptional(prop)
                return {
                    name: prop.getName(),
                    scope: Scope.Private,
                    type: !isNotBuiltInType(propType) ? propType.getText() : getNestedTypeDeclaration(prop),
                    initializer: `${getFakeValue(propType)}`,
                    hasQuestionToken: isOptional,
                }
            }
        )
    );

    newBuilderClass.addMethods(
        typeObject.getProperties().map(prop => {
                let propType = determinePropType(prop, newBuilderClass)
                return {
                    name: determinePrefix(propType, prop),
                    parameters: [{
                        name: 'value',
                        type: !isNotBuiltInType(propType) ? propType.getText() : getNestedTypeDeclaration(prop)
                    }],
                    returnType: `${typeName}Builder`,
                    statements: `this.${prop.getName()} = value
                    return this;`,
                }
            }
        ));

    console.log('decl', typeDeclaration)
    newBuilderClass.addMethod({
        name: 'build',
        returnType: typeDeclaration ?? typeName,
        statements: `return {
            ${typeObject.getProperties().map(prop => `${prop.getName()}: this.${prop.getName()}`).join(",\n")}
        }`
    });

    return {
        nestedTypes,
    }
}

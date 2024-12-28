import {ClassDeclaration, InterfaceDeclaration, Project, Scope, SourceFile, TypeLiteralNode} from "ts-morph";
import {determinePrefix, erasePrefixFromMethod, getFakeValue, getSubTypeName, isNotBuiltInType} from "./helpers";
import {InputArguments, TypingDeclaration} from "./model";
import {isInterfaceDeclaration, isTypeLiteralNode} from "./typeGuards";

export async function generateMock(project: Project, sourceFile: SourceFile, typeName: string, args: InputArguments) {
    const filePath = sourceFile.getFilePath();
    const baseInterface: TypingDeclaration = sourceFile.getInterface(typeName) ?? sourceFile.getTypeAlias(typeName);

    if (!baseInterface) {
        console.error(`Type or Interface "${typeName}" not found in file ${filePath}`);
        process.exit(1);
    }


    const outputFilePath = `${sourceFile.getDirectoryPath()}/${typeName}Builder.ts`;

    const outputFile = generateOutputFile(project, args.outputDirectory ? `${args.outputDirectory}/${typeName}Builder.ts` : outputFilePath);
    const oldBuilderObject = outputFile.getClass(`${typeName}Builder`);
    const {nestedInterfaces} = args.updateMode === 'merge' ?
        mergeMockBuilder(oldBuilderObject, baseInterface) :
        generateMockBuilder(outputFile, baseInterface, oldBuilderObject)
    outputFile.fixMissingImports();
    outputFile.formatText();
    await outputFile.save();

    nestedInterfaces.forEach(nestedInterface => {
        generateMock(project, nestedInterface.getSourceFile(), nestedInterface.getName(), args);
    });
}

function generateMockBuilder(outputFile: SourceFile, typeObject: TypingDeclaration, oldBuilderObject?: ClassDeclaration): {
    nestedInterfaces: InterfaceDeclaration[]
} {
    //remove existing builder if present
    if (oldBuilderObject !== undefined) {
        oldBuilderObject.remove()
    }

    const typeName = typeObject.getName();
    const newBuilderClass = outputFile.addClass({
        name: `${typeName}Builder`,
        isExported: true,
    })
    console.log(`CREATED Mock builder at: ${newBuilderClass.getSourceFile().getFilePath()}`);
    return processMockBuilder(typeObject, newBuilderClass, buildMockBuilder)
}

function mergeMockBuilder(oldBuilderObject: ClassDeclaration, typeObject: TypingDeclaration): {
    nestedInterfaces: InterfaceDeclaration[]
} {
    console.log(`UPDATED Mock builder generated at: ${oldBuilderObject.getSourceFile().getFilePath()}`);
    return processMockBuilder(typeObject, oldBuilderObject, mergingMockBuilder)
}

function processMockBuilder(
    typeObject: TypingDeclaration,
    builderObject: ClassDeclaration,
    builderFunction: (
        typeName: string,
        typeNode: InterfaceDeclaration | TypeLiteralNode,
        builderObject: ClassDeclaration,
        nestedInterfaces: InterfaceDeclaration[]
    ) => { nestedInterfaces: InterfaceDeclaration[] }
): { nestedInterfaces: InterfaceDeclaration[] } {
    const typeName = typeObject.getName();

    if (isInterfaceDeclaration(typeObject)) {
        return builderFunction(typeName, typeObject, builderObject, []);
    } else {
        const node = typeObject.getTypeNodeOrThrow();
        if (isTypeLiteralNode(node)) {
            return builderFunction(typeName, node, builderObject, []);
        }
    }
    throw new Error("Unsupported typeObject format");
}

function generateOutputFile(project: Project, outputFilePath: string): SourceFile {
    const outputFile = project.getSourceFile(outputFilePath);
    return outputFile ?? project.createSourceFile(outputFilePath, undefined, {overwrite: true});
}

function mergingMockBuilder(typeName: string, typeObject: InterfaceDeclaration | TypeLiteralNode, oldBuilderObject: ClassDeclaration) {
    const interfaceProperties = typeObject.getProperties().map(prop => prop.getName());
    const oldBuilderProperties = oldBuilderObject.getProperties().map(prop => prop.getName());
    if (!!oldBuilderObject.getDecorator('fixed')) return {nestedInterfaces: []};

    typeObject.getProperties().forEach((prop, index) => {
        if (oldBuilderObject.getProperty(prop.getName())) {
            const oldProp = oldBuilderObject.getProperty(prop.getName());
            const propFixed = !!oldProp.getDecorators().find(d => d.getName() === 'fixed');
            if (!propFixed) {
                oldProp.setType(getSubTypeName(prop.getType().getText()));
                oldProp.setInitializer(getFakeValue(prop));
            }
        } else {
            oldBuilderObject.addProperty({
                name: prop.getName(),
                type: getSubTypeName(prop.getType().getText()),
                initializer: getFakeValue(prop),
            }).setOrder(index);

            oldBuilderObject.addMethod(
                {
                    name: determinePrefix(prop),
                    parameters: [{name: 'value', type: getSubTypeName(prop.getType().getText())}],
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

    return {nestedInterfaces: []};
}

function buildMockBuilder(typeName: string,
                          typeObject: InterfaceDeclaration | TypeLiteralNode,
                          newBuilderClass: ClassDeclaration) {
    const nestedInterfaces = []

    typeObject.getProperties().forEach(prop => {
        const propType = prop.getType();
        if (propType.isObject() && isNotBuiltInType(propType)) {
            const nestedInterface = propType.getSymbol().getDeclarations()[0];
            nestedInterfaces.push(nestedInterface);
        }
    });


    newBuilderClass.addProperties(
        typeObject.getProperties().map(prop => {
                return {
                    name: prop.getName(),
                    scope: Scope.Private,
                    type: getSubTypeName(prop.getType().getText()),
                    initializer: `${getFakeValue(prop)}`,
                    hasQuestionToken: prop.hasQuestionToken(),
                }
            }
        )
    );

    newBuilderClass.addMethods(
        typeObject.getProperties().map(prop => {
                return {
                    name: determinePrefix(prop),
                    parameters: [{name: 'value', type: getSubTypeName(prop.getType().getText())}],
                    returnType: `${typeName}Builder`,
                    statements: `this.${prop.getName()} = value
                    return this;`,
                }
            }
        ));

    newBuilderClass.addMethod({
        name: 'build',
        returnType: typeName,
        statements: `return {
            ${typeObject.getProperties().map(prop => `${prop.getName()}: this.${prop.getName()}`).join(",\n")}
        }`
    });

    return {
        nestedInterfaces,
    }
}

import {ClassDeclaration, InterfaceDeclaration, Project, SourceFile} from "ts-morph";
import {determinePrefix, erasePrefixFromMethod, getFakeValue, getSubTypeName} from "./helpers";
import {InputArguments} from "./model";

export async function generateMock(project: Project, sourceFile: SourceFile, interfaceName: string, args: InputArguments) {
    const filePath = sourceFile.getFilePath();

    const typeAliasOrInterface = sourceFile.getInterface(interfaceName);

    if (!typeAliasOrInterface) {
        console.error(`Type or Interface "${interfaceName}" not found in file ${filePath}`);
        process.exit(1);
    }


    const outputFilePath = `${sourceFile.getDirectoryPath()}/${interfaceName}Builder.ts`;

    const outputFile = generateOutputFile(project, args.outputDirectory ? `${args.outputDirectory}/${interfaceName}Builder.ts` : outputFilePath);
    const oldBuilderObject = outputFile.getClass(`${interfaceName}Builder`);
    const {nestedInterfaces} = args.updateMode === 'merge' ?
        mergeMockBuilder(oldBuilderObject, typeAliasOrInterface) :
        generateMockBuilder(outputFile, typeAliasOrInterface)
    outputFile.fixMissingImports();
    outputFile.formatText();
    await outputFile.save();

    nestedInterfaces.forEach(nestedInterface => {
        generateMock(project, nestedInterface.getSourceFile(), nestedInterface.getName(), args);
    });

    console.log(`Mock builder generated at: ${outputFilePath}`);
}


function getFixedProps(cls: ClassDeclaration): string[] {
    return cls.getProperties().filter(prop => {
        return prop.getDecorators().find(d => d.getName() === 'fixed');
    }).map(prop => prop.getName());
}


// Helper function to check if a type is a built-in type
function isNotBuiltInType(type) {
    const typeText = type.getText();

    // Built-in types to check against
    const builtInTypes = [
        "string", "number", "boolean", "bigint", "symbol", "undefined", "null",
        "Date", "RegExp", "Array", "object", "any"
    ];

    // If it's an array type, it resolves to `Array<type>` in ts-morph
    if (type.isArray()) {
        return false;
    }

    // If the type text matches any of the built-in types
    return !builtInTypes.includes(typeText);
}

function generateMockBuilder(outputFile: SourceFile, interfaceObject: InterfaceDeclaration): {
    nestedInterfaces: InterfaceDeclaration[]
} {
    const nestedInterfaces = [];
    const interfaceName = interfaceObject.getName();
    const newBuilderClass = outputFile.addClass({
        name: `${interfaceName}Builder`,
        isExported: true,
    })

    interfaceObject.getProperties().forEach(prop => {
        const propType = prop.getType();
        if (propType.isObject() && isNotBuiltInType(propType)) {
            const nestedInterface = propType.getSymbol().getDeclarations()[0];
            nestedInterfaces.push(nestedInterface);
        }
    });

    newBuilderClass.addProperties(
        interfaceObject.getProperties().map(prop => {
                return {
                    name: prop.getName(),
                    type: getSubTypeName(prop.getType().getText()),
                    initializer: `${getFakeValue(prop)}`,
                    hasQuestionToken: prop.hasQuestionToken(),
                }
            }
        )
    );

    newBuilderClass.addMethods(
        interfaceObject.getProperties().map(prop => {
                return {
                    name: determinePrefix(prop),
                    parameters: [{name: 'value', type: getSubTypeName(prop.getType().getText())}],
                    returnType: `${interfaceName}Builder`,
                    statements: `this.${prop.getName()} = value
                    return this;`,
                }
            }
        ));

    newBuilderClass.addMethod({
        name: 'build',
        returnType: interfaceName,
        statements: `return {
            ${interfaceObject.getProperties().map(prop => `${prop.getName()}: this.${prop.getName()}`).join(",\n")}
        }`
    });

    return {
        nestedInterfaces,
    }
}

function mergeMockBuilder(oldBuilderObject: ClassDeclaration, interfaceObject: InterfaceDeclaration): {
    nestedInterfaces: InterfaceDeclaration[]
} {
    const nestedInterfaces = [];
    const interfaceProperties = interfaceObject.getProperties().map(prop => prop.getName());
    const oldBuilderProperties = oldBuilderObject.getProperties().map(prop => prop.getName());
    if(!!oldBuilderObject.getDecorator('fixed')) return { nestedInterfaces: []};

    interfaceObject.getProperties().forEach((prop, index) => {
       if(oldBuilderObject.getProperty(prop.getName())) {
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
                      returnType: `${interfaceObject.getName()}Builder`,
                      statements: `this.${prop.getName()} = value
                    return this;`,
                  }
              ).setOrder(interfaceObject.getProperties().length + index);
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
            const interfaceProp = interfaceObject.getProperty(erasePrefixFromMethod(methodName));
            if (!interfaceProp) {
                method.remove();
            }
        });

    oldBuilderObject.getMethod('build').setBodyText(
        `return {
            ${interfaceObject.getProperties().map(prop => `${prop.getName()}: this.${prop.getName()}`).join(",\n")}
        }`
    )

    return {nestedInterfaces: []};
}

function generateOutputFile(project: Project, outputFilePath: string): SourceFile {
    const outputFile = project.getSourceFile(outputFilePath);
    return outputFile ?? project.createSourceFile(outputFilePath, undefined, {overwrite: true});
}

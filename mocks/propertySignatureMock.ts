import {OptionalKind, Project, PropertySignature, PropertySignatureStructure} from "ts-morph";

const project = new Project();

export function createPropertySignatureMock(
    name: string,
    options: {
        type?: string;
        isOptional?: boolean;
        hasQuestionToken?: boolean;
        isReadonly?: boolean;
        hasExclamationToken?: boolean;
    } = {}
): PropertySignature {
    // Create a temporary source file to hold our property
    const sourceFile = project.createSourceFile(
        'temp.ts',
        `interface TempInterface { ${options.isReadonly ? 'readonly ' : ''}${name}${
            options.hasQuestionToken ? '?' : ''
        }${options.hasExclamationToken ? '!' : ''}: ${options.type || 'string'}; }`
    , { overwrite: true });

    const propertySignature = sourceFile.getInterfaces()[0].getProperties()[0];
    project.removeSourceFile(sourceFile);

    return propertySignature;
}

export function createPropertyWithType(propertyText: string): PropertySignature {
    const filename = `temp-${Math.random().toString(36).slice(2)}.ts`;

    const sourceFile = project.createSourceFile(
        filename,
        `interface TestInterface {
            ${propertyText}
        }`,
        { overwrite: true }
    );

    const property = sourceFile.getInterfaces()[0].getProperties()[0];


    return property;
}
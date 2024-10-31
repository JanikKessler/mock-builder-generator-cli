#!/usr/bin/env node
import {input, select} from "@inquirer/prompts";
import {select as multiselect} from "inquirer-select-pro"
import {Project} from "ts-morph";
import {generateMock} from "./generate-mock-builder";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {InputArguments} from "./model";


async function run() {
// CLI arguments
    const argv = yargs(hideBin(process.argv)).options({
        mode: {
            alias: 'm',
            choices: ['overwrite', 'merge'] as const,
            type: 'string',
            description: 'mode'
        },
        files: {
            alias: 'd',
            type: "string",
            description: 'directory'
        },
        dir: {
            alias: 'd',
            type: "string",
            description: 'output directory'
        }
    }).parseSync()

    const updateMode = argv.mode ?? await select({
        message: 'Which update mod do you want to use',
        choices: ['overwrite', 'merge'],
        default: 'merge',
    }) as 'overwrite' | 'merge';

    const files = argv.files ?? await input({
        message: 'In which directory do you want to search for files',
        default: './examples/',
    });


    const outputDirectory = argv.dir ?? await input({
        message: 'In which directory do you want to save the mock builders',
        default: undefined,
    });

    const args: InputArguments = {
        updateMode,
        outputDirectory,
        files,
    }

    const project = new Project();
    const sourceFiles = project.addSourceFilesAtPaths(args.files.concat('**/*.ts'));
    const interfaces = sourceFiles.flatMap(sourceFile => sourceFile.getInterfaces());

    const allInterfacesPrompt = await select({
        message: 'Do you want to generate mock builders for all interfaces?',
        choices: [{name: 'Yes', value: true}, {name: 'No', value: false}],
        default: 'Yes'
    });

    if (!allInterfacesPrompt) {
        const selectedInterface = await multiselect({
            message: 'Select an interface',
            options: async (input) => {
                if (!input) {
                    return [];
                }

                const response = interfaces.filter((interfaceDeclaration) => {
                    return interfaceDeclaration.getName().toLowerCase().includes(input.toLowerCase());
                })

                return response.map((sub) => ({
                    name: sub.getName(),
                    value: sub,
                    description: sub.getName(),
                }));
            },
        });
        selectedInterface.forEach(interfaceDeclaration =>
            generateMock(project, interfaceDeclaration.getSourceFile(), interfaceDeclaration.getName(), args)
        );
    } else {
        sourceFiles.forEach(sourceFile => {
                sourceFile.getInterfaces().forEach(interfaceDeclaration =>
                    generateMock(project, sourceFile, interfaceDeclaration.getName(), args))
            }
        );
    }
}

run();

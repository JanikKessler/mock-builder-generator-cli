import {input, select} from "@inquirer/prompts";
import {select as multiselect} from "inquirer-select-pro"
import {Project} from "ts-morph";
import {generateMock} from "./generate-mock-builder";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {Options, TypingDeclaration, UpdateMode} from "./model";

export async function run(options: Options, updateMode: UpdateMode) {
// CLI arguments
    const argv = yargs(hideBin(process.argv)).options({
        files: {
            alias: 'f',
            type: "string",
            default: '.',
            description: 'source directory'
        },
        dir: {
            alias: 'd',
            type: "string",
            description: 'output directory'
        }
    }).parseSync()

    let files: string | null = argv.files
    let outputDirectory: string | null = argv.dir


    if (options.interactive) {
        files = await input({
            message: 'From Which source path do you want to generate the mock builders',
            default: '.',
        });


        outputDirectory = await input({
            message: 'In which directory do you want to save the mock builders',
            default: undefined,
        });
    }

    const args = {
        updateMode,
        files,
        outputDirectory
    }


    const project = new Project();
    const sourceFiles = project.addSourceFilesAtPaths(args.files.concat('/**/*.ts'));
    const nestedTypesTempFile = project.createSourceFile('tmp.ts')
    const types: TypingDeclaration[] = sourceFiles.flatMap(sourceFile => [...sourceFile.getInterfaces(), ...sourceFile.getTypeAliases()]);

    let allInterfacesPrompt = true
    if (options.interactive) {
        allInterfacesPrompt = await select({
            message: 'Do you want to generate mock builders for all interfaces?',
            choices: [{name: 'Yes', value: true}, {name: 'No', value: false}],
            default: 'Yes'
        });
    }

    if (!allInterfacesPrompt) {
        const selectedType = await multiselect({
            message: 'Select an interface',
            options: async (input) => {
                if (!input) {
                    return [];
                }

                const response = types.filter((typeDeclaration) => {
                    return typeDeclaration.getName().toLowerCase().includes(input.toLowerCase());
                })

                return response.map((sub) => ({
                    name: sub.getName(),
                    value: sub,
                    description: sub.getName(),
                }));
            },
        });
        for(const typeDeclaration of selectedType) {
            await generateMock(project, typeDeclaration.getSourceFile(), nestedTypesTempFile, typeDeclaration.getName(), args)
        }
    } else {
        for(const sourceFile of sourceFiles) {
            const types = [...sourceFile.getInterfaces(), ...sourceFile.getTypeAliases()];
            for(const typeDeclaration of types) {
                await generateMock(project, typeDeclaration.getSourceFile(), nestedTypesTempFile, typeDeclaration.getName(), args)
            }
        }
    }

    await nestedTypesTempFile.deleteImmediately();
}
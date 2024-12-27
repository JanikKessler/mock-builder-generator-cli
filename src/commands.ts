import { Command } from 'commander';
import {run} from "./generate-mock";
import {Options} from "./model";

const program = new Command();

program
    .name('mock-builder-generator-cli')
    .description('Generates mock builders for TypeScript interfaces and types')
    .version('0.2.0');

program
    .command('generate')
    .description('Generate mock builders from scratch')
    .option('-i, --interactive', 'Enable interactive mode', false)
    .action((options: Options) => {
        run(options, 'overwrite')
    });

program
    .command('merge')
    .description('Merge mock builders with existing')
    .option('-i, --interactive', 'Enable interactive mode', false)
    .action((options:Options) => {
        run(options, 'merge')
    });

export default program;

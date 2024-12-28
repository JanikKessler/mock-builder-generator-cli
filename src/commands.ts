import { Command } from 'commander';
import {run} from "./generate-mock";
import {Options} from "./model";
import path from "node:path";
import * as fs from "node:fs";

const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();


program
    .name('mock-builder-generator-cli')
    .description('packageInfo.description')
    .version('0.2.12');

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

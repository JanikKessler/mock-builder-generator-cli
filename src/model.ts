export interface InputArguments {
    updateMode: 'overwrite' | 'merge';
    outputDirectory: string | undefined;
    files: string;
}

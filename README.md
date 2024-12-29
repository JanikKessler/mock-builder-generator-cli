# TypeScript Mock Generator

This project is a TypeScript-based CLI tool for generating mock builders for TypeScript interfaces and type aliases. It uses `ts-morph` for TypeScript AST manipulation and `yargs` for command-line argument parsing.

## Features

- Generate mock builders for all interfaces and type aliases in a specified directory.
- Interactive mode for selecting specific interfaces to generate mock builders.
- Customizable output directory for generated mock builders.

## Prerequisites

- Node.js (>= 14.x)
- npm (>= 6.x)

## Usage

### Command Line

To run the CLI tool, use the following command:

```sh
npx mbg generate <path> [options]
```
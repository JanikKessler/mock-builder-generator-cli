import {determinePrefix, erasePrefixFromMethod, getNestedTypeDeclaration, isNotBuiltInType} from "./helpers";
import {Node, PropertySignature, ts, Type} from "ts-morph";
import {type} from "node:os";
import {typeMocks} from "../mocks/typeMocks";
import {createPropertySignatureMock, createPropertyWithType} from "../mocks/propertySignatureMock";

describe('helper', () => {
    describe('erasePrefixFromMethod', () => {
        it('should return method name without with prefix', () => {
            const mockMethodName = 'withName';
            const result = erasePrefixFromMethod(mockMethodName);
            expect(result).toBe('name');
        })

        it('should return method name without is prefix', () => {
            const mockMethodName = 'isName';
            const result = erasePrefixFromMethod(mockMethodName);
            expect(result).toBe('name');
        })

        it('should return method name with random prefix - no change', () => {
            const mockMethodName = 'hasName';
            const result = erasePrefixFromMethod(mockMethodName);
            expect(result).toBe('hasName');
        })
    })

    describe('determinePrefix', () => {
        it('should return method name with "with" prefix --> No Boolean', () => {
            const mockProp = {
                getName: () => 'name',
                getType: () => ({isBoolean: () => false})
            } as PropertySignature;
            const result = determinePrefix(mockProp.getType(), mockProp);
            expect(result).toBe('withName');
        })

        it('should return method name with "is" prefix --> Boolean', () => {
            const mockProp = {
                getName: () => 'name',
                getType: () => ({isBoolean: () => true})
            } as PropertySignature;
            const result = determinePrefix(mockProp.getType(), mockProp);
            expect(result).toBe('isName');
        })
    })

    describe('isNotBuiltInType', () => {
        typeMocks.forEach((input) => {
            const text = typeof input.getText === 'function' ? input.getText() : 'No getText';
            test(`returns false when input is ${text}`, () => {
                const result = isNotBuiltInType(input);
                expect(result).toBe(false);
            });
        });
    })

    describe('PropertySignature handling', () => {
        it('removes semicolon from simple type', () => {
            const prop = createPropertyWithType('prop: string;');
            expect(getNestedTypeDeclaration(prop)).toBe('string');
        });

        it('removes array notation with semicolon', () => {
            const prop = createPropertyWithType('prop: string[];');
            expect(getNestedTypeDeclaration(prop)).toBe('string');
        });

        it('removes array notation without semicolon', () => {
            const prop = createPropertyWithType('prop: number[]');
            expect(getNestedTypeDeclaration(prop)).toBe('number');
        });

        it('handles complex type with array notation and semicolon', () => {
            const prop = createPropertyWithType('prop: MyCustomType[];');
            expect(getNestedTypeDeclaration(prop)).toBe('MyCustomType');
        });

        it('handles union types', () => {
            const prop = createPropertyWithType('prop: (string | number)[];');
            expect(getNestedTypeDeclaration(prop)).toBe('(string | number)');
        });

        it('handles generic types', () => {
            const prop = createPropertyWithType('prop: Array<string>;');
            expect(getNestedTypeDeclaration(prop)).toBe('string');
        });

        it('handles nested array types', () => {
            const prop = createPropertyWithType('prop: string[][];');
            expect(getNestedTypeDeclaration(prop)).toBe('string[]');
        });
    });

    describe('Symbol handling', () => {
        // Mock Symbol implementation since we can't easily create real Symbols with ts-morph
        const createMockSymbol = (valueDeclarationText: string) => ({
            getValueDeclarationOrThrow: () => ({
                getText: () => valueDeclarationText
            })
        });

        it('handles Symbol with simple type', () => {
            const symbol = createMockSymbol('prop: string;');
            expect(getNestedTypeDeclaration(symbol as any)).toBe('string');
        });

        it('handles Symbol with array type and semicolon', () => {
            const symbol = createMockSymbol('prop: number[];');
            expect(getNestedTypeDeclaration(symbol as any)).toBe('number');
        });

        it('handles Symbol with array type without semicolon', () => {
            const symbol = createMockSymbol('prop: boolean[]');
            expect(getNestedTypeDeclaration(symbol as any)).toBe('boolean');
        });
    });

    describe('Edge cases', () => {
        it('handles type with square brackets in name', () => {
            const prop = createPropertyWithType('prop: Bracket[Name];');
            expect(getNestedTypeDeclaration(prop)).toBe('Bracket[Name]');
        });

        it('handles empty type', () => {
            const prop = createPropertyWithType('prop: ;');
            expect(getNestedTypeDeclaration(prop)).toBe('');
        });

        it('handles type with multiple semicolons', () => {
            const prop = createPropertyWithType('prop: Type;;;');
            expect(getNestedTypeDeclaration(prop)).toBe('Type');
        });
    });
});

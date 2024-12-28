import {determinePrefix, erasePrefixFromMethod, isNotBuiltInType} from "./helpers";
import {PropertySignature, Type} from "ts-morph";
import {type} from "node:os";
import {typeMocks} from "../mocks/typeMocks";

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
            const result = determinePrefix(mockProp);
            expect(result).toBe('withName');
        })

        it('should return method name with "is" prefix --> Boolean', () => {
            const mockProp = {
                getName: () => 'name',
                getType: () => ({isBoolean: () => true})
            } as PropertySignature;
            const result = determinePrefix(mockProp);
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
})

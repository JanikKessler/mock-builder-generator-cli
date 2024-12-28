import {Type} from "ts-morph";

export const typeMock = (name: string, isArray: boolean) => ({
    getText: jest.fn().mockReturnValue(name),
    isArray: jest.fn().mockReturnValue(isArray)
}) as unknown as Type

export const typeMocks: Type[] = [
    typeMock("string", false),
    typeMock("number", false),
    typeMock("boolean", false),
    typeMock("bigint", false),
    typeMock("symbol", false),
    typeMock("undefined", false),
    typeMock("Date", false),
    typeMock("RegExp", false),
    typeMock("Array", true),
    typeMock("object", false),
    typeMock("any", false)

]
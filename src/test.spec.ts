import {determinePrefix, erasePrefixFromMethod, getNestedTypeDeclaration, isNotBuiltInType} from "./helpers";
import {Node, PropertySignature, ts, Type} from "ts-morph";
import {type} from "node:os";
import {typeMocks} from "../mocks/typeMocks";
import {createPropertySignatureMock, createPropertyWithType} from "../mocks/propertySignatureMock";
import {AnalysisEventOut} from "../examples/AnalysisEventOut";
import {AnalysisEventOutBuilder} from "../examples/test/AnalysisEventOutBuilder";
import {AnalysisCategoryIdOutBuilder} from "../examples/test/AnalysisCategoryIdOutBuilder";

describe('helper', () => {
    describe('erasePrefixFromMethod', () => {
        it('should have the Category GOAL', () => {

            const MockCategory = new AnalysisCategoryIdOutBuilder().withId('testId').build()
            const MockEvent = new AnalysisEventOutBuilder().withCategory(MockCategory).build()


            const result = getAnalysisCategroyIdFromEvent(MockEvent)

            expect(result).toBe('testId');
        })
    });
});


export function getAnalysisCategroyIdFromEvent(event: AnalysisEventOut): string {
    return event.category.id;
}
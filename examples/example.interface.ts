import {ExampleTwo} from "../nested/exampleTwo.interface";
import {ExampleThree} from "../nested/exampleThree.interface";

export interface Example {
    age: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    skills: ExampleTwo
    friends: ExampleThree
}

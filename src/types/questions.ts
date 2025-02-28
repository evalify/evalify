import { Language } from '@/lib/programming-languages';

export type QuestionType = "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "DESCRIPTIVE" | "CODING" | "FILE_UPLOAD";
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type BloomsTaxonomyLevel = "REMEMBERING" | "UNDERSTANDING" | "APPLYING" | "ANALYZING" | "EVALUATING" | "CREATING";

interface BaseQuestion {
    _id?: string;
    id?: string;
    type: QuestionType;
    difficulty: DifficultyLevel;
    topics?: string[];
    bankId?: string;
    explanation: string;
    createdBy?: string;
    createdAt?: string;
    question: string;
    mark: number;
    bloomsLevel: BloomsTaxonomyLevel;
    courseOutcome?: string;
}

interface MCQOption {
    optionId: string;
    option: string;
    image?: string;
}

export interface MCQQuestion extends BaseQuestion {
    type: "MCQ";
    options: MCQOption[];
    answer: string[];
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: "TRUE_FALSE";
    options: MCQOption[];
    answer: string;
}

export interface DescriptiveQuestion extends BaseQuestion {
    type: "DESCRIPTIVE";
    expectedAnswer: string;
    guidelines?: string;
}

export interface FillInBlankQuestion extends BaseQuestion {
    type: "FILL_IN_BLANK";
    expectedAnswer: string;
}

export interface FileUploadQuestion extends BaseQuestion {
    type: "FILE_UPLOAD";
    attachedFile?: string;
    guidelines?: string;
}

export interface TestCase {
    id: string;
    inputs: any[];
    output: any;
    testCode?: string;
}

interface FunctionDetails {
    functionName: string;
    params: Array<{ name: string; type: string }>;
    returnType: string;
    language: Language;
}

export interface CodingQuestion extends BaseQuestion {
    type: "CODING";
    functionDetails: FunctionDetails;
    testCases: TestCase[];
    boilerplateCode: string;
    driverCode: string;
    expectedAnswer?: string; // This will store the combined boilerplate + driver code
}

export interface CodeFile {
    id: string;
    name: string;
    language: string;
    content: string;
}

export type Question = 
    | MCQQuestion 
    | TrueFalseQuestion 
    | DescriptiveQuestion 
    | FillInBlankQuestion 
    | FileUploadQuestion 
    | CodingQuestion;

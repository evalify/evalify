import * as z from "zod"

const mcqSchema = z.object({
    type: z.literal("MCQ"),
    difficulty: z.enum(["easy", "medium", "hard"]),
    marks: z.number().min(1, "Marks must be at least 1"),
    question: z.string().min(1, "Question is required"),
    explanation: z.string().optional(),
    options: z.array(z.object({
        option: z.string().min(1, "Option is required"),
        optionId: z.string()
    })).min(2, "At least 2 options are required"),
    answer: z.array(z.string()).min(1, "At least one answer is required")
})

const descriptiveSchema = z.object({
    type: z.literal("DESCRIPTIVE"),
    difficulty: z.enum(["easy", "medium", "hard"]),
    marks: z.number().min(1, "Marks must be at least 1"),
    question: z.string().min(1, "Question is required"),
    explanation: z.string().optional(),
})

export const questionSchema = z.discriminatedUnion("type", [mcqSchema, descriptiveSchema])

export type Question = {
    _id?: string;
    type: 'MCQ' | 'DESCRIPTIVE' | 'CODING' | 'TRUE_FALSE' | 'FILL_BLANKS';
    difficulty: 'easy' | 'medium' | 'hard';
    marks: number;
    question: string;
    explanation: string;
    // MCQ specific
    options?: { option: string; optionId: string; }[];
    answer?: string[];
    // True/False specific
    correctAnswer?: boolean;
    // Fill in the blanks specific
    blanksAnswer?: string[];
    // Coding specific
    testCases?: any[];
    language?: string;
    functionName?: string;
}

export type QuestionFormValues = z.infer<typeof questionSchema>


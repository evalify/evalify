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

export type Question = z.infer<typeof questionSchema>
export type QuestionFormValues = z.infer<typeof questionSchema>


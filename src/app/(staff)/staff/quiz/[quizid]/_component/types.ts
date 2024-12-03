import * as z from "zod"

export const questionSchema = z.object({
    type: z.string().min(1, "Question type is required"),
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

export type Question = {
    _id?: string
    type: string
    difficulty: 'easy' | 'medium' | 'hard'
    marks: number
    question: string
    explanation: string
    options: Array<{ option: string; optionId: string }>
    answer: string[]
}

export type QuestionFormValues = z.infer<typeof questionSchema>


import { boolean, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { quizzesTable } from "./quiz";

export const quizEvaluationSettingsTable = pgTable("quiz_evaluation_settings", {
    id: uuid("id")
        .primaryKey()
        .references(() => quizzesTable.id, { onDelete: "cascade" }),

    // MCQ Settings
    mcqGlobalPartialMarking: boolean("mcq_global_partial_marking").notNull().default(false),
    mcqGlobalNegativeMark: real("mcq_global_negative_mark"),
    mcqGlobalNegativePercent: real("mcq_global_negative_percent"),

    // Coding Settings
    codingGlobalPartialMarking: boolean("coding_global_partial_marking").notNull().default(false),

    // LLM Settings
    llmEvaluationEnabled: boolean("llm_evaluation_enabled").notNull().default(false),
    llmProvider: text("llm_provider"),
    llmModelName: text("llm_model_name"),

    // Prompts
    fitbLlmSystemPrompt: text("fitb_llm_system_prompt"),
    descLlmSystemPrompt: text("desc_llm_system_prompt"),
});

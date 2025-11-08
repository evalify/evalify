import { Question, QuestionType, MCQQuestion, MMCQQuestion } from "@/types/questions";

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export function validateQuestion(question: Question | null): ValidationResult {
    const errors: ValidationError[] = [];

    if (!question) {
        errors.push({
            field: "question",
            message: "Question data is missing",
        });
        return { isValid: false, errors };
    }

    // Common validations
    if (!question.question || question.question.trim() === "" || question.question === "<p></p>") {
        errors.push({
            field: "question",
            message: "Question text is required",
        });
    }

    if (question.marks <= 0) {
        errors.push({
            field: "marks",
            message: "Marks must be greater than 0",
        });
    }

    if (question.negativeMarks < 0) {
        errors.push({
            field: "negativeMarks",
            message: "Negative marks cannot be less than 0",
        });
    }

    // Type-specific validations
    switch (question.type) {
        case QuestionType.MCQ:
        case QuestionType.MMCQ:
            if ("questionData" in question && "solution" in question) {
                const mcqQuestion = question as MCQQuestion | MMCQQuestion;
                const options = mcqQuestion.questionData.options;
                const correctOptions = mcqQuestion.solution.correctOptions;

                if (!options || options.length < 2) {
                    errors.push({
                        field: "options",
                        message: "At least 2 options are required",
                    });
                }

                if (!correctOptions || correctOptions.length === 0) {
                    errors.push({
                        field: "options",
                        message: "At least one correct answer must be selected",
                    });
                }

                if (
                    question.type === QuestionType.MCQ &&
                    correctOptions &&
                    correctOptions.length > 1
                ) {
                    errors.push({
                        field: "options",
                        message:
                            "MCQ can have only one correct answer. Use MMCQ for multiple correct answers.",
                    });
                }

                // Check for empty option text
                if (options) {
                    options.forEach((opt, index) => {
                        if (
                            !opt.optionText ||
                            opt.optionText.trim() === "" ||
                            opt.optionText === "<p></p>"
                        ) {
                            errors.push({
                                field: `options[${index}]`,
                                message: `Option ${index + 1} text cannot be empty`,
                            });
                        }
                    });
                }
            }
            break;
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

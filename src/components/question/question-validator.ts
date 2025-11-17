import {
    Question,
    QuestionType,
    MCQQuestion,
    MMCQQuestion,
    FillInBlanksQuestion,
    TrueFalseQuestion,
    DescriptiveQuestion,
    MatchTheFollowingQuestion,
} from "@/types/questions";

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

        case QuestionType.FILL_THE_BLANK:
            const fibQuestion = question as FillInBlanksQuestion;
            const blankConfig = fibQuestion.blankConfig;

            if (!blankConfig || blankConfig.blankCount === 0) {
                errors.push({
                    field: "blanks",
                    message:
                        "At least one blank is required. Use three or more underscores (___) to create blanks.",
                });
                break;
            }

            const totalWeight = Object.values(blankConfig.blankWeights || {}).reduce(
                (sum, weight) => sum + (weight || 0),
                0
            );

            if (Math.abs(totalWeight - question.marks) > 0.01) {
                errors.push({
                    field: "blankWeights",
                    message: `Total weight (${totalWeight.toFixed(2)}) must equal total marks (${question.marks})`,
                });
            }

            for (let i = 0; i < blankConfig.blankCount; i++) {
                const answerGroup = blankConfig.acceptableAnswers[i];
                if (!answerGroup) {
                    errors.push({
                        field: `blank[${i}]`,
                        message: `Blank ${i + 1} must have answers configured`,
                    });
                    continue;
                }

                if (!answerGroup.answers || answerGroup.answers.length === 0) {
                    errors.push({
                        field: `blank[${i}]`,
                        message: `Blank ${i + 1} must have at least one answer`,
                    });
                } else {
                    answerGroup.answers.forEach((answer, answerIndex) => {
                        if (!answer || answer.trim() === "") {
                            errors.push({
                                field: `blank[${i}].answer[${answerIndex}]`,
                                message: `Blank ${i + 1} answer ${answerIndex + 1} cannot be empty`,
                            });
                        } else {
                            // Validate that the answer matches the declared type
                            const answerType = answerGroup.type;
                            const trimmedAnswer = answer.trim();

                            switch (answerType) {
                                case "NUMBER":
                                    if (!/^-?\d*\.?\d+$/.test(trimmedAnswer)) {
                                        errors.push({
                                            field: `blank[${i}].answer[${answerIndex}]`,
                                            message: `Blank ${i + 1} answer ${answerIndex + 1} must be a valid number (type: NUMBER)`,
                                        });
                                    }
                                    break;

                                case "UPPERCASE":
                                    if (
                                        trimmedAnswer !== trimmedAnswer.toUpperCase() ||
                                        /[a-z]/.test(trimmedAnswer)
                                    ) {
                                        errors.push({
                                            field: `blank[${i}].answer[${answerIndex}]`,
                                            message: `Blank ${i + 1} answer ${answerIndex + 1} must contain only uppercase letters (type: UPPERCASE)`,
                                        });
                                    }
                                    break;

                                case "LOWERCASE":
                                    if (
                                        trimmedAnswer !== trimmedAnswer.toLowerCase() ||
                                        /[A-Z]/.test(trimmedAnswer)
                                    ) {
                                        errors.push({
                                            field: `blank[${i}].answer[${answerIndex}]`,
                                            message: `Blank ${i + 1} answer ${answerIndex + 1} must contain only lowercase letters (type: LOWERCASE)`,
                                        });
                                    }
                                    break;

                                case "TEXT":
                                    // TEXT type accepts any input
                                    break;

                                default:
                                    break;
                            }
                        }
                    });
                }
            }
            break;

        case QuestionType.TRUE_FALSE:
            const tfQuestion = question as TrueFalseQuestion;
            if (tfQuestion.trueFalseAnswer === undefined || tfQuestion.trueFalseAnswer === null) {
                errors.push({
                    field: "trueFalseAnswer",
                    message: "Please select True or False as the correct answer",
                });
            }
            break;

        case QuestionType.DESCRIPTIVE:
            const descQuestion = question as DescriptiveQuestion;
            if (!descQuestion.descriptiveConfig) {
                errors.push({
                    field: "descriptiveConfig",
                    message: "Descriptive configuration is required",
                });
            }
            break;

        case QuestionType.MATCHING:
            const matchQuestion = question as MatchTheFollowingQuestion;
            const leftOptions = (matchQuestion.options || []).filter((opt) => opt.isLeft);
            const rightOptions = (matchQuestion.options || []).filter((opt) => !opt.isLeft);

            if (leftOptions.length === 0) {
                errors.push({
                    field: "leftOptions",
                    message: "At least one left item is required",
                });
            }

            if (rightOptions.length === 0) {
                errors.push({
                    field: "rightOptions",
                    message: "At least one right item is required",
                });
            }

            leftOptions.forEach((leftOpt, index) => {
                if (!leftOpt.text || leftOpt.text.trim() === "" || leftOpt.text === "<p></p>") {
                    errors.push({
                        field: `leftOption[${index}]`,
                        message: `Left item ${index + 1} text cannot be empty`,
                    });
                }

                if (!leftOpt.matchPairIds || leftOpt.matchPairIds.length === 0) {
                    errors.push({
                        field: `leftOption[${index}]`,
                        message: `Left item ${index + 1} must have at least one match`,
                    });
                }
            });

            rightOptions.forEach((rightOpt, index) => {
                if (!rightOpt.text || rightOpt.text.trim() === "" || rightOpt.text === "<p></p>") {
                    errors.push({
                        field: `rightOption[${index}]`,
                        message: `Right item ${index + 1} text cannot be empty`,
                    });
                }
            });
            break;
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

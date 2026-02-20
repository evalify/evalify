"use client";

import { trpc } from "@/lib/trpc/client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ExamQueryProvider, useExamCollectionsContext } from "../providers/exam-query-provider";
import { useQuestionResponses, useQuestionState } from "../hooks/use-exam-collections";
import { useAutoSubmit } from "../hooks/use-auto-submit";
import { QuestionItem, StudentAnswer, QuizInfo as BaseQuizInfo } from "../lib/types";
import { isResponseAnswered } from "../utils";

export interface QuizSection {
    id: string;
    name: string;
    orderIndex: number;
}

export type QuizQuestion = QuestionItem & {
    response?: StudentAnswer;
    _visited?: boolean;
    _markedForReview?: boolean;
};

export interface QuizInfo extends BaseQuizInfo {
    sections?: QuizSection[];
    parts?: QuizSection[];
    currentSection?: string | null;
}

export interface Profile {
    id?: string;
    name?: string;
    email?: string;
    profileId?: string;
    profileImage?: string | null;
}

export interface QuestionStats {
    answered: number;
    unattempted: number;
    markedForReview: number;
    visited: number;
    total: number;
}

type QuizContextValue = {
    quizId: string;
    questions: QuizQuestion[];
    setQuestions: (q: QuizQuestion[]) => void;
    sanitizedQuestions: QuizQuestion[];
    quizInfo?: QuizInfo | null;
    profile?: Profile | null;
    saveAnswer: (responsePatch: Record<string, StudentAnswer>) => Promise<void>;
    submitQuiz: () => Promise<void>;
    sections: QuizSection[];
    selectedSection: string | null;
    setSelectedSection: (id: string | null) => void;
    selectedQuestion: string | null;
    setSelectedQuestion: (id: string | null) => void;
    sectionQuestions: QuizQuestion[];
    currentQuestion: QuizQuestion | null;
    toggleMarkForReview: (questionId: string) => void;
    markAsVisited: (questionId: string) => void;
    getQuestionStats: () => QuestionStats;
    getSectionStats: (sectionId: string) => QuestionStats;
    isAutoSubmitting: boolean;
    isSubmitted: boolean;
};

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

function QuizContextInner({
    quizId,
    quizQuestions,
    quizInfo,
    profile,
    children,
    sections,
}: {
    quizId: string;
    quizQuestions: QuestionItem[];
    quizInfo?: QuizInfo | null;
    profile?: Profile | null;
    children: React.ReactNode;
    sections?: { sections: QuizSection[] } | QuizSection[];
}) {
    const { collections } = useExamCollectionsContext();

    if (!collections) {
        throw new Error("Collections not initialized");
    }

    const { responses, saveResponse } = useQuestionResponses(collections.responses);
    const {
        states,
        markAsVisited: markAsVisitedDb,
        toggleMarkForReview: toggleMarkForReviewDb,
    } = useQuestionState(collections.state);

    const submitMutation = trpc.exam.submitQuiz.useMutation();
    const submitQuiz = useCallback(async () => {
        await submitMutation.mutateAsync({ quizId });
    }, [quizId, submitMutation]);

    const { isAutoSubmitting } = useAutoSubmit(collections.metadata, submitQuiz);

    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

    // Merge questions with responses and state
    const questions = useMemo(() => {
        const responsesMap = new Map(responses.map((r) => [r.questionId, r.response]));
        const statesMap = new Map(states.map((s) => [s.questionId, s]));

        return quizQuestions.map((q) => {
            const response = responsesMap.get(q.id);
            const state = statesMap.get(q.id);

            return {
                ...q,
                response: response || undefined,
                _visited: state?.visited || false,
                _markedForReview: state?.markedForReview || false,
            };
        });
    }, [quizQuestions, responses, states]);

    // No-op setQuestions for backward compatibility if needed, or remove it from context type if possible.
    // For now, we'll keep it but it won't do much since state is driven by DB.
    const setQuestions = useCallback((_q: QuizQuestion[]) => {
        console.warn("setQuestions is deprecated. State is managed by TanStack DB.");
    }, []);

    // helper to extract a section id from question object (various shapes)
    const getSectionId = (q: QuizQuestion): string | null => {
        // Check various possible locations for section ID
        if (q.sectionId) return q.sectionId;

        // Handle nested section object
        const withSection = q as QuizQuestion & { section?: { id: string } };
        if (withSection.section?.id) return withSection.section.id;

        // Handle alternative field names
        const withAltFields = q as QuizQuestion & {
            quizSectionId?: string;
            section_id?: string;
        };
        return withAltFields.quizSectionId ?? withAltFields.section_id ?? null;
    };

    // Normalize sections from various shapes
    const normalizedSections = useMemo((): QuizSection[] => {
        if (Array.isArray(sections)) return sections;
        if (sections && "sections" in sections) return sections.sections;
        if (quizInfo?.sections) return quizInfo.sections;
        if (quizInfo?.parts) return quizInfo.parts;
        return [];
    }, [sections, quizInfo]);

    const sanitizedQuestions = useMemo(() => {
        const sortedQuestions = [...questions].sort((a, b) => {
            const sectionA = normalizedSections.find((s) => s.id === getSectionId(a));
            const sectionB = normalizedSections.find((s) => s.id === getSectionId(b));

            // If both have sections, sort by section order
            if (sectionA && sectionB) {
                if (sectionA.orderIndex !== sectionB.orderIndex) {
                    return sectionA.orderIndex - sectionB.orderIndex;
                }
            }
            // Fallback to existing order if no section or same section
            return 0;
        });

        return sortedQuestions.map((q) => {
            const {
                solution: _solution,
                explanation: _explanation,
                ...rest
            } = q as QuizQuestion & {
                solution?: unknown;
                explanation?: string;
            };
            return rest;
        });
    }, [questions, normalizedSections]);

    const sectionQuestions = useMemo((): QuizQuestion[] => {
        if (!selectedSection) return questions;
        return questions.filter((q) => getSectionId(q) === selectedSection);
    }, [questions, selectedSection]);

    const currentQuestion = useMemo((): QuizQuestion | null => {
        if (selectedQuestion) return questions.find((q) => q.id === selectedQuestion) ?? null;
        return sectionQuestions.length > 0
            ? sectionQuestions[0]
            : questions.length > 0
              ? questions[0]
              : null;
    }, [selectedQuestion, questions, sectionQuestions]);

    // Helper functions for question state management
    const toggleMarkForReview = useCallback(
        (questionId: string) => {
            toggleMarkForReviewDb(questionId);
        },
        [toggleMarkForReviewDb]
    );

    const markAsVisited = useCallback(
        (questionId: string) => {
            markAsVisitedDb(questionId);
        },
        [markAsVisitedDb]
    );

    const getQuestionStats = useCallback((): QuestionStats => {
        const answered = questions.filter((q) => isResponseAnswered(q.response)).length;
        const markedForReview = questions.filter((q) => q._markedForReview).length;
        const visited = questions.filter(
            (q) => q._visited && !isResponseAnswered(q.response)
        ).length;
        const total = questions.length;
        const unattempted = total - answered - visited;
        return { answered, unattempted, markedForReview, visited, total };
    }, [questions]);

    const getSectionStats = useCallback(
        (sectionId: string): QuestionStats => {
            const sectionQs = questions.filter((q) => getSectionId(q) === sectionId);
            const answered = sectionQs.filter((q) => isResponseAnswered(q.response)).length;
            const markedForReview = sectionQs.filter((q) => q._markedForReview).length;
            const visited = sectionQs.filter(
                (q) => q._visited && !isResponseAnswered(q.response)
            ).length;
            const total = sectionQs.length;
            const unattempted = total - answered - visited;
            return { answered, unattempted, markedForReview, visited, total };
        },
        [questions]
    );

    // ensure defaults: if no selectedSection but sections provided, set to first section
    useEffect(() => {
        if (!selectedSection && normalizedSections.length > 0) {
            queueMicrotask(() => setSelectedSection(normalizedSections[0].id));
        }
    }, [normalizedSections, selectedSection]);

    // set initial selected question when questions load
    useEffect(() => {
        if (!selectedQuestion && currentQuestion) {
            queueMicrotask(() => setSelectedQuestion(currentQuestion.id));
        }
    }, [currentQuestion, selectedQuestion]);

    // Automatically mark question as visited when it's viewed
    // Automatically mark question as visited when it's viewed
    useEffect(() => {
        if (currentQuestion?.id) {
            markAsVisited(currentQuestion.id);
        }
    }, [currentQuestion?.id, markAsVisited]);

    // Automatically switch section if the current question belongs to a different section
    useEffect(() => {
        if (currentQuestion && normalizedSections.length > 0) {
            const questionSectionId = getSectionId(currentQuestion);
            if (questionSectionId && questionSectionId !== selectedSection) {
                queueMicrotask(() => setSelectedSection(questionSectionId));
            }
        }
    }, [currentQuestion, normalizedSections, selectedSection]);

    // const submitMutation = trpc.exam.submitQuiz.useMutation(); // Moved up

    // Wrap saveResponse to match expected signature if needed, or use directly
    // The context expects saveAnswer: (responsePatch: Record<string, unknown>) => Promise<void>
    // But useQuestionResponses.saveResponse is (questionId: string, answer: Record<string, unknown>) => void
    // Wait, existing saveAnswer in context was taking a patch for the whole quiz?
    // Let's check the previous implementation.
    // Previous: saveMutation.mutateAsync({ quizId, responsePatch });
    // responsePatch was { [questionId]: response }

    // We need to support the same interface for now.
    const saveAnswer = useCallback(
        async (responsePatch: Record<string, StudentAnswer>) => {
            // Iterate over keys in patch and save individually to collection
            // This might be slightly inefficient if saving many at once, but usually it's one by one.
            Object.entries(responsePatch).forEach(([questionId, response]) => {
                saveResponse(questionId, response);
            });
        },
        [saveResponse]
    );

    // const submitQuiz = useCallback(async () => {
    //     await submitMutation.mutateAsync({ quizId });
    // }, [quizId, submitMutation]); // Moved up

    const value = useMemo(
        () => ({
            quizId,
            questions,
            setQuestions,
            sanitizedQuestions,
            quizInfo: quizInfo ?? null,
            profile: profile ?? null,
            saveAnswer,
            submitQuiz,
            sections: normalizedSections,
            selectedSection: selectedSection ?? null,
            setSelectedSection,
            selectedQuestion: selectedQuestion ?? null,
            setSelectedQuestion,
            sectionQuestions,
            currentQuestion: currentQuestion ?? null,
            toggleMarkForReview,
            markAsVisited,
            getQuestionStats,
            getSectionStats,
            isAutoSubmitting,
            isSubmitted: submitMutation.isSuccess,
        }),
        [
            quizId,
            questions,
            setQuestions,
            sanitizedQuestions,
            quizInfo,
            profile,
            normalizedSections,
            selectedSection,
            selectedQuestion,
            sectionQuestions,
            currentQuestion,
            saveAnswer,
            submitQuiz,
            toggleMarkForReview,
            markAsVisited,
            getQuestionStats,
            getSectionStats,
            isAutoSubmitting,
            submitMutation.isSuccess,
        ]
    );

    return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function QuizProvider({
    quizId,
    quizQuestions,
    quizInfo,
    profile,
    children,
    sections,
}: {
    quizId: string;
    quizQuestions?: QuestionItem[];
    quizInfo?: QuizInfo | null;
    profile?: Profile | null;
    children: React.ReactNode;
    sections?: { sections: QuizSection[] } | QuizSection[];
}) {
    const trpcUtils = trpc.useUtils();
    const { mutateAsync: saveAnswerMutate } = trpc.exam.saveAnswer.useMutation();

    const fetchQuestions = useCallback(async (): Promise<QuestionItem[]> => {
        if (quizQuestions) {
            return quizQuestions;
        }
        const { questions } = await trpcUtils.client.exam.getStudentQuestions.query({ quizId });
        return questions;
    }, [quizId, quizQuestions, trpcUtils]);

    const fetchResponses = useCallback(async () => {
        const resp = await trpcUtils.exam.getResponse.fetch({ quizId });
        return (resp.response?.response || {}) as Record<string, StudentAnswer>;
    }, [quizId, trpcUtils]);

    const saveAnswerToServer = useCallback(
        async (responsePatch: Record<string, StudentAnswer>) => {
            await saveAnswerMutate({ quizId, responsePatch });
        },
        [quizId, saveAnswerMutate]
    );

    const questionIds = useMemo(() => quizQuestions?.map((q) => q.id) || [], [quizQuestions]);

    return (
        <ExamQueryProvider
            quizId={quizId}
            studentId={profile?.id ?? ""}
            fetchQuestions={fetchQuestions}
            fetchResponses={fetchResponses}
            saveAnswer={saveAnswerToServer}
            questionIds={questionIds}
            quizInfo={quizInfo}
        >
            <QuizContextInner
                quizId={quizId}
                quizQuestions={quizQuestions || []}
                quizInfo={quizInfo}
                profile={profile}
                sections={sections}
            >
                {children}
            </QuizContextInner>
        </ExamQueryProvider>
    );
}

export function useQuizContext() {
    const ctx = useContext(QuizContext);
    if (!ctx) throw new Error("useQuizContext must be used within a QuizProvider");
    return ctx;
}

export default QuizProvider;

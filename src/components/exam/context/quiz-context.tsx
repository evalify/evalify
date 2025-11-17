"use client";

import { trpc } from "@/lib/trpc/client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface QuizSection {
    id: string;
    name: string;
    orderIndex: number;
}

export type QuizQuestion = Record<string, unknown> & {
    id: string;
    type?: string;
    sectionId?: string | null;
    orderIndex?: number;
    response?: Record<string, unknown>;
    _visited?: boolean;
    _markedForReview?: boolean;
};

export interface QuizInfo {
    id: string;
    name?: string;
    endTime?: string | Date | null;
    startTime?: string | Date | null;
    duration?: string | null;
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
    saveAnswer: (responsePatch: Record<string, unknown>) => Promise<void>;
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
};

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export function QuizProvider({
    quizId,
    quizQuestions,
    quizInfo,
    profile,
    children,
    sections,
}: {
    quizId: string;
    quizQuestions?: QuizQuestion[];
    quizInfo?: QuizInfo | null;
    profile?: Profile | null;
    children: React.ReactNode;
    sections?: { sections: QuizSection[] } | QuizSection[];
}) {
    const [questions, setQuestions] = useState<QuizQuestion[]>(quizQuestions || []);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

    const sanitizedQuestions = useMemo(() => {
        return questions.map((q) => {
            const {
                solution: _solution,
                explaination: _explaination,
                ...rest
            } = q as QuizQuestion & {
                solution?: unknown;
                explaination?: unknown;
            };
            return rest;
        });
    }, [questions]);

    // helper to extract a section id from question object (various shapes)
    const getSectionId = (q: QuizQuestion): string | null =>
        q?.sectionId ??
        (q as QuizQuestion & { section?: { id: string } })?.section?.id ??
        (q as QuizQuestion & { quizSectionId?: string })?.quizSectionId ??
        (q as QuizQuestion & { section_id?: string })?.section_id ??
        null;

    // Normalize sections from various shapes
    const normalizedSections = useMemo((): QuizSection[] => {
        if (Array.isArray(sections)) return sections;
        if (sections && "sections" in sections) return sections.sections;
        if (quizInfo?.sections) return quizInfo.sections;
        if (quizInfo?.parts) return quizInfo.parts;
        return [];
    }, [sections, quizInfo]);

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
    const toggleMarkForReview = useCallback((questionId: string) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === questionId ? { ...q, _markedForReview: !q._markedForReview } : q
            )
        );
    }, []);

    const markAsVisited = useCallback((questionId: string) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === questionId ? { ...q, _visited: true } : q))
        );
    }, []);

    const getQuestionStats = useCallback((): QuestionStats => {
        const answered = questions.filter(
            (q) => q.response && Object.keys(q.response).length > 0
        ).length;
        const markedForReview = questions.filter((q) => q._markedForReview).length;
        const visited = questions.filter(
            (q) => q._visited && !(q.response && Object.keys(q.response).length > 0)
        ).length;
        const total = questions.length;
        const unattempted = total - answered - visited;
        return { answered, unattempted, markedForReview, visited, total };
    }, [questions]);

    const getSectionStats = useCallback(
        (sectionId: string): QuestionStats => {
            const sectionQs = questions.filter((q) => getSectionId(q) === sectionId);
            const answered = sectionQs.filter(
                (q) => q.response && Object.keys(q.response).length > 0
            ).length;
            const markedForReview = sectionQs.filter((q) => q._markedForReview).length;
            const visited = sectionQs.filter(
                (q) => q._visited && !(q.response && Object.keys(q.response).length > 0)
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

    const saveMutation = trpc.exam.saveAnswer.useMutation();
    const submitMutation = trpc.exam.submitQuiz.useMutation();

    const saveAnswer = useCallback(
        async (responsePatch: Record<string, unknown>) => {
            await saveMutation.mutateAsync({ quizId, responsePatch });
        },
        [quizId, saveMutation]
    );

    const submitQuiz = useCallback(async () => {
        await submitMutation.mutateAsync({ quizId });
    }, [quizId, submitMutation]);

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
        }),
        [
            quizId,
            questions,
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
        ]
    );

    return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuizContext() {
    const ctx = useContext(QuizContext);
    if (!ctx) throw new Error("useQuizContext must be used within a QuizProvider");
    return ctx;
}

export default QuizProvider;

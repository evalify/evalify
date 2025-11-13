"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface QuestionNavigationState {
    bankId: string | null;
    questionId: string | null;
    topicIds: string[];
}

interface QuestionNavigationContextType {
    navigationState: QuestionNavigationState;
    setNavigationTarget: (bankId: string, questionId: string, topicIds: string[]) => void;
    clearNavigationTarget: () => void;
}

const QuestionNavigationContext = createContext<QuestionNavigationContextType | undefined>(
    undefined
);

export function QuestionNavigationProvider({ children }: { children: ReactNode }) {
    const [navigationState, setNavigationState] = useState<QuestionNavigationState>({
        bankId: null,
        questionId: null,
        topicIds: [],
    });

    const setNavigationTarget = useCallback(
        (bankId: string, questionId: string, topicIds: string[]) => {
            setNavigationState({
                bankId,
                questionId,
                topicIds,
            });
        },
        []
    );

    const clearNavigationTarget = useCallback(() => {
        setNavigationState({
            bankId: null,
            questionId: null,
            topicIds: [],
        });
    }, []);

    return (
        <QuestionNavigationContext.Provider
            value={{
                navigationState,
                setNavigationTarget,
                clearNavigationTarget,
            }}
        >
            {children}
        </QuestionNavigationContext.Provider>
    );
}

export function useQuestionNavigation() {
    const context = useContext(QuestionNavigationContext);
    if (context === undefined) {
        throw new Error("useQuestionNavigation must be used within a QuestionNavigationProvider");
    }
    return context;
}

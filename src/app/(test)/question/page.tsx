"use client"

import React from 'react'
import { MCQ } from '@/components/question/mcq'
import { EnhancedMcq } from '../../../components/question/enhanced_mcq';

const sampleQuestion = {
    id: 'q1',
    question: 'What is the capital of France? This is a longer question to demonstrate text wrapping for larger content in the question area.',
    options: [
        { id: 'a', option: 'London - This is a longer option to demonstrate text wrapping for larger content in the options.' },
        { id: 'b', option: 'Berlin' },
        { id: 'c', option: 'Paris - The City of Light, known for its iconic Eiffel Tower and world-renowned cuisine.' },
        { id: 'd', option: 'Madrid' },
    ],
}

export default function QuizPage() {
    const handleAnswerSelected = (selectedOptionId: string) => {
        console.log('Selected option:', selectedOptionId)
    }

    return (
        <div className="grid grid-cols-9 w-screen">
            <div className='col-span-7 mt-5 ml-5'>
                <MCQ
                    id={sampleQuestion.id}
                    question={sampleQuestion.question}
                    options={sampleQuestion.options}
                    onAnswerSelected={handleAnswerSelected}
                />
                <EnhancedMcq
                    id={sampleQuestion.id}
                    question={sampleQuestion.question}
                    options={sampleQuestion.options}
                    onAnswerSelected={handleAnswerSelected}
                />
            </div>
            <div className='col-span-2'>

            </div>
        </div>
    )
}


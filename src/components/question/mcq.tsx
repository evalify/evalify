"use client"

import React, { useState } from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'

type Option = {
    id: string
    option: string
}

type Props = {
    id: string
    question: string
    options: Option[]
    onAnswerSelected?: (selectedOptionId: string) => void
}

export function MCQ({ id, question, options, onAnswerSelected }: Props) {
    const [selectedOption, setSelectedOption] = useState<string | undefined>()

    const handleOptionChange = (value: string) => {
        setSelectedOption(value)
        onAnswerSelected?.(value)
    }

    return (
        <div className="mx-auto sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 break-words text-pretty">{question}</h2>
            <RadioGroup.Root onValueChange={handleOptionChange} value={selectedOption}>
                <div className="space-y-4">
                    {options.map((opt) => (
                        <div
                            key={opt.id}
                            className={`flex items-start p-4 rounded-lg border-1 transition-colors duration-200 ease-in-out
                ${selectedOption === opt.id
                                    ? 'border-blue-400'
                                    : 'border-slate-600 hover:border-blue-400 '
                                }`}
                        >
                            <RadioGroup.Item
                                value={opt.id}
                                id={`${id}-${opt.id}`}
                                className="w-6 h-6 rounded-full border-2 border-slate-400 flex items-center justify-center mr-4 mt-1 flex-shrink-0"
                            >
                                <RadioGroup.Indicator className="w-3 h-3 bg-blue-400 rounded-full" />
                            </RadioGroup.Item>
                            <label htmlFor={`${id}-${opt.id}`} className="text-base sm:text-lg  cursor-pointer flex-grow break-words text-pretty">
                                {opt.option}
                            </label>
                        </div>
                    ))}
                </div>
            </RadioGroup.Root>
        </div>
    )
}



"use client"

import React, { useState, useEffect } from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { Label } from "@/components/ui/label";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/customdialog";
import { Button } from '@/components/ui/button';

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

export function EnhancedMcq({ id, question, options, onAnswerSelected }: Props) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null)

    const handleOptionChange = (value: string) => {
        setSelectedOption(value)
        onAnswerSelected?.(value)
    }

    return (
        <div className="mx-auto  sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 break-words text-pretty">{question}</h2>
            <RadioGroup.Root onValueChange={handleOptionChange} value={selectedOption}>
                <div className="space-y-4">
                    <EnhancedAnswer 

                        options={options.map(option => option.option)}
                        value={selectedOption}
                        onValueChange={setSelectedOption}
                    />
                </div>
            </RadioGroup.Root>
        </div>
    )
}



interface EnhancedRadioGroupProps {
    options: string[];
    value: string | null;
    onValueChange: (value: string | null) => void;
}

const EnhancedAnswer: React.FC<EnhancedRadioGroupProps> = ({ options, value, onValueChange }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false); // Manage dialog state
    const [isAnswerUpdating, setIsAnswerUpdating] = useState(false); // Track user interaction

    // Handle input value change
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsAnswerUpdating(true); // User is interacting
        onValueChange(event.target.value);
    };

    // Handle select option change
    const handleSelect = (selectedValue: string | null) => {
        if (selectedValue === 'null') {
            onValueChange('');
        }
        setIsAnswerUpdating(true); // User is interacting
        onValueChange(selectedValue);
    };

    // Auto-close dialog after 3 seconds, only if user is not interacting
    useEffect(() => {
        if (isDialogOpen && !isAnswerUpdating) {
            const timer = setTimeout(() => {
                setIsDialogOpen(false); // Close the dialog
            }, 3000);

            return () => clearTimeout(timer); // Cleanup timer when component unmounts or dialog closes
        }
    }, [isDialogOpen, isAnswerUpdating]);

    // Handle user stopping the interaction
    const handleInteractionEnd = () => {
        setIsAnswerUpdating(false); // User stopped interacting
    };


    return (
        <div>
            <div className='flex flex-col gap-3 '>

                {options.map((option, index) => (
                    <div key={index}>
                        <Label className="text-lg font-light">
                            {index + 1}) {option}
                        </Label>
                    </div>
                ))}
            </div>


            <div className="flex items-center justify-center mt-10">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setIsDialogOpen(true)}>Answer</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>ANSWER</DialogTitle>
                            <DialogDescription>
                                <div className="flex justify-center items-center gap-4">
                                    <Select value={value || ''} onValueChange={handleSelect} onBlur={handleInteractionEnd}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem key={-1} value={'null'}>Choose An Option</SelectItem>
                                            {
                                                options.map((option, index) => (
                                                    <SelectItem key={index} value={`${option}`}>
                                                        {index + 1}
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

// export default EnhancedAnswer;

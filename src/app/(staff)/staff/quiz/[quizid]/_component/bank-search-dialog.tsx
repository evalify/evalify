import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Question } from "./types";
import { Combobox } from "@/components/ui/combobox";

interface Bank {
    id: string;
    name: string;
    description?: string;
    isOwner: boolean;
}

interface BankSearchDialogProps {
    onQuestionsAdd: (questions: Question[]) => void;
}

export function BankSearchDialog({ onQuestionsAdd }: BankSearchDialogProps) {
    const [banks, setBanks] = useState<Bank[]>([]);
    const [selectedBank, setSelectedBank] = useState<string>('');
    const [topics, setTopics] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    const difficultyOptions = ['easy', 'medium', 'hard'];
    const typeOptions = ['MCQ', 'DESCRIPTIVE', 'CODING', 'TRUE_FALSE', 'FILL_BLANKS'];

    useEffect(() => {
        fetchBanks();
    }, []);

    useEffect(() => {
        if (selectedBank) {
            fetchTopics();
        }
    }, [selectedBank]);

    const fetchBanks = async () => {
        try {
            const response = await fetch('/api/staff/bank');
            const data = await response.json();
            console.log('Bank data:', data); // Debug log
            
            // Ensure data is an array and has required properties
            if (Array.isArray(data)) {
                const validBanks = data.filter(bank => bank && bank.id && bank.name);
                setBanks(validBanks.map(bank => ({
                    id: bank.id,
                    name: bank.isOwner ? bank.name : `${bank.name} (Shared)`,
                    description: bank.description,
                    isOwner: bank.isOwner
                })));
            } else {
                console.error('Unexpected bank data format:', data);
                toast.error("Invalid bank data format");
                setBanks([]); // Set empty array as fallback
            }
        } catch (error) {
            console.error('Bank fetch error:', error);
            toast.error("Failed to fetch banks");
            setBanks([]); // Set empty array on error
        }
    };

    const fetchTopics = async () => {
        try {
            if (!selectedBank) {
                setTopics([]); // Reset topics if no bank selected
                return;
            }
            const response = await fetch(`/api/staff/bank/${selectedBank}/topics`);
            const data = await response.json();
            console.log('Topics data:', data); // Debug log
            
            // Ensure topics is always an array
            setTopics(Array.isArray(data.topics) ? data.topics : []);
        } catch (error) {
            console.error('Topics fetch error:', error);
            toast.error("Failed to fetch topics");
            setTopics([]); // Set empty array on error
        }
    };

    const handleSearch = async () => {
        try {
            if (!selectedBank) {
                toast.error("Please select a bank");
                return;
            }

            // Find the selected bank to check ownership
            const selectedBankData = banks.find(b => b.id === selectedBank);
            
            if (!selectedBankData) {
                toast.error("Invalid bank selected");
                return;
            }

            const response = await fetch('/api/staff/bank/search-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankIds: [selectedBank],
                    topics: selectedTopics,
                    difficulty: selectedDifficulty,
                    types: selectedTypes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch questions');
            }

            const { questions } = await response.json();
            onQuestionsAdd(questions);
            toast.success(`${questions.length} questions added to quiz`);
        } catch (error) {
            toast.error("Failed to fetch questions");
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add from Bank
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Search Question Bank</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Bank</label>
                        <Combobox
                            options={banks.map(bank => ({
                                label: bank.name,
                                value: bank.id,
                            }))}
                            value={selectedBank}
                            onSelect={setSelectedBank}
                            placeholder="Select a bank..."
                            searchPlaceholder="Search banks..."
                        />
                    </div>

                    {selectedBank && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Topics</label>
                                <MultiSelect
                                    options={topics.map(topic => ({
                                        label: topic || '',
                                        value: topic || ''
                                    }))}
                                    selected={selectedTopics}
                                    onChange={setSelectedTopics}
                                    placeholder="Select topics..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Difficulty</label>
                                <MultiSelect
                                    options={difficultyOptions.map(d => ({
                                        label: d,
                                        value: d
                                    }))}
                                    selected={selectedDifficulty}
                                    onChange={setSelectedDifficulty}
                                    placeholder="Select difficulty..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Question Types</label>
                                <MultiSelect
                                    options={typeOptions.map(t => ({
                                        label: t.replace('_', ' '),
                                        value: t
                                    }))}
                                    selected={selectedTypes}
                                    onChange={setSelectedTypes}
                                    placeholder="Select question types..."
                                />
                            </div>
                        </>
                    )}

                    <Button 
                        onClick={handleSearch}
                        disabled={!selectedBank} // Disable if no bank selected
                    >
                        Search and Add Questions
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

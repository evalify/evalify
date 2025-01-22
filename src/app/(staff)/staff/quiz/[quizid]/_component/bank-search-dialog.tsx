import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Check, RefreshCcw, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Question } from "./types";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuestionsList from '@/components/bank/QuestionsList';

interface Bank {
    id: string;
    name: string;
    description?: string;
    isOwner: boolean;
}

interface Topic {
    id: string;
    name: string;
}

interface BankSearchDialogProps {
    onQuestionsAdd: (questions: Question[]) => void;
    existingQuestions: Question[];
    quizId: string; // Add quizId prop
}

interface Analytics {
    totalQuestions: number;
    byDifficulty: Record<string, number>;
    byType: Record<string, number>;
    byTopic: Record<string, number>;
}

// Add this shuffle function near the top of the file
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export function BankSearchDialog({ onQuestionsAdd, existingQuestions, quizId }: BankSearchDialogProps) {
    const [banks, setBanks] = useState<Bank[]>([]);
    const [selectedBank, setSelectedBank] = useState<string>('');
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(1);
    const [fetchedQuestions, setFetchedQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);

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
                setTopics([]);
                return;
            }
            const response = await fetch(`/api/staff/bank/${selectedBank}/topics`);
            const data = await response.json();
            console.log('Topics data:', data); // Debug log
            
            // Ensure we're handling topic objects correctly
            if (Array.isArray(data.topics)) {
                const validTopics = data.topics.map(topic => ({
                    id: topic.id || topic._id || topic.name,  // Fallback if id is not present
                    name: topic.name || topic
                }));
                setTopics(validTopics);
            } else {
                setTopics([]);
            }
        } catch (error) {
            console.error('Topics fetch error:', error);
            toast.error("Failed to fetch topics");
            setTopics([]);
        }
    };

    const handleFetchQuestions = async () => {
        try {
            setIsLoading(true);
            
            const response = await fetch('/api/staff/bank/search-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankIds: [selectedBank],
                    topics: selectedTopic === '_ANY' ? [] : selectedTopic ? [selectedTopic] : [],
                    difficulty: selectedDifficulty === '_ANY' ? [] : selectedDifficulty ? [selectedDifficulty] : [],
                    types: selectedType === '_ANY' ? [] : selectedType ? [selectedType] : [],
                    count: questionCount,
                    random: true,
                    quizId // Pass quizId instead of existingQuestions
                })
            });

            if (!response.ok) throw new Error('Failed to fetch questions');

            const { questions } = await response.json();
            // Shuffle the questions before setting them
            setFetchedQuestions(shuffleArray(questions).slice(0, questionCount));
        } catch (error) {
            toast.error("Failed to fetch questions");
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveQuestions = async () => {
        try {
            const response = await fetch(`/api/staff/quiz/questions/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questions: fetchedQuestions,
                    quizId: params.quizId
                })
            });

            if (!response.ok) throw new Error('Failed to save questions');
            
            onQuestionsAdd(fetchedQuestions);
            setFetchedQuestions([]);
            toast.success("Questions added to quiz successfully");
        } catch (error) {
            toast.error("Failed to save questions to quiz");
        }
    };

    const removeQuestion = (index: number) => {
        setFetchedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddQuestions = () => {
        if (fetchedQuestions.length === 0) {
            toast.error("No questions to add");
            return;
        }
        onQuestionsAdd(fetchedQuestions);
        setFetchedQuestions([]);
    };

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add from Bank
                </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[95vh]">
                <DrawerHeader>
                    <DrawerTitle>Add Questions from Bank</DrawerTitle>
                </DrawerHeader>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">

                        <div className="space-y-2">
                            <Label>Question Bank</Label>
                            <Select value={selectedBank} onValueChange={setSelectedBank}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select bank" />
                                </SelectTrigger>
                                <SelectContent>
                                    {banks.map(bank => (
                                        <SelectItem key={bank.id} value={bank.id}>
                                            {bank.name} - ({bank.description || 'No description'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Topic</Label>
                            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_ANY">Any Topic</SelectItem>
                                    {topics.map(topic => (
                                        <SelectItem key={topic.id} value={topic.id}>
                                            {topic.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_ANY">Any Difficulty</SelectItem>
                                    {['EASY', 'MEDIUM', 'HARD'].map(diff => (
                                        <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Question Type</Label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_ANY">Any Type</SelectItem>
                                    {['MCQ', 'DESCRIPTIVE', 'CODING', 'TRUE_FALSE', 'FILL_BLANKS'].map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Number of Questions</Label>
                            <Input
                                type="number"
                                min={1}
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button 
                                onClick={handleFetchQuestions} 
                                disabled={!selectedBank || isLoading}
                                className="w-full"
                            >
                                {isLoading ? "Fetching..." : "Fetch Questions"}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Preview Questions ({fetchedQuestions.length})</h3>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={handleFetchQuestions}
                                    disabled={isLoading}
                                >
                                    <RefreshCcw className="h-4 w-4 mr-2" />
                                    Fetch New
                                </Button>
                                <Button
                                    onClick={handleAddQuestions}
                                    disabled={fetchedQuestions.length === 0}
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Add Selected
                                </Button>
                            </div>
                        </div>

                        {/* Replace the card-based list with QuestionsList */}
                        <div className="max-h-[500px] overflow-y-auto">
                            <QuestionsList
                                questions={fetchedQuestions}
                                onEdit={() => {}} // Not needed for preview
                                onDelete={removeQuestion}
                                onQuestionUpdate={() => {}} // Not needed for preview
                                requireTopics={false}
                                bankId={selectedBank}
                                topic={[]}
                                showActions={false} // Add this prop to QuestionsList to hide edit/delete buttons if needed
                            />
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Language } from '@/lib/programming-languages';
import { Badge } from '@/components/ui/badge';
import { X, Plus, CopyIcon } from 'lucide-react';
import { LatexPreview } from '@/components/latex-preview';
import { useToast } from "@/components/hooks/use-toast";

interface Parameter {
    name: string;
    type: string;
}

interface TestCase {
    id: string;
    inputs: any[];
    output: any;
}

interface TestCaseGeneratorProps {
    language: Language;
    functionName: string;
    parameters: Parameter[];
    onTestCaseAdd: (testCase: TestCase) => void;
}

export function TestCaseGenerator({ language, functionName, parameters, onTestCaseAdd }: TestCaseGeneratorProps) {
    const { toast } = useToast();
    const [inputs, setInputs] = useState<string[]>(Array(parameters.length).fill(''));
    const [output, setOutput] = useState('');
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setInputs(Array(parameters.length).fill(''));
        setError(null);
    }, [parameters.length]);

    // Parse Octave matrix format [1 2 3; 4 5 6] into a 2D array
    const parseOctaveMatrix = (value: string): number[][] => {
        // Remove brackets
        const matrixContent = value.trim().replace(/^\[|\]$/g, '');
        // Split by semicolons to get rows
        const rows = matrixContent.split(';').map(row => row.trim());
        // Convert each row to numbers
        return rows.map(row => 
            row.split(/\s+/).map(num => parseFloat(num))
        );
    };

    const parseInput = (value: string, type: string) => {
        try {
            if (type === 'int') return parseInt(value);
            if (type === 'float' || type === 'double') return parseFloat(value);
            if (type === 'str' || type === 'string') return value;
            
            if (language === 'octave' && type === 'matrix') {
                return parseOctaveMatrix(value);
            }
            
            if (type.includes('List') || type === 'array' || 
                (type === 'matrix' && language !== 'octave')) {
                return JSON.parse(value);
            }
            
            return value;
        } catch (error) {
            console.error('Error parsing input:', error);
            return value;
        }
    };

    const handleAddTestCase = () => {
        setError(null);
        if (inputs.some(input => !input) || !output) {
            setError("Please fill in all inputs and output");
            toast({
                title: "Missing Values",
                description: "Please fill in all inputs and output",
                variant: "destructive"
            });
            return;
        }

        try {
            // For the return value, use the function's return type if available
            const returnType = parameters.length > 0 ? parameters[0].type : 'any';
            
            const newTestCase: TestCase = {
                id: (testCases.length + 1).toString(),
                inputs: inputs.map((input, index) => parseInput(input, parameters[index].type)),
                output: parseInput(output, returnType)
            };
            
            setTestCases([...testCases, newTestCase]);
            onTestCaseAdd(newTestCase);
            
            // Reset inputs
            setInputs(Array(parameters.length).fill(''));
            setOutput('');
            toast({
                title: "Success",
                description: "Test case added successfully",
            });
        } catch (error) {
            setError("Failed to add test case: " + (error instanceof Error ? error.message : String(error)));
            toast({
                title: "Error",
                description: "Failed to add test case. Please check your input format.",
                variant: "destructive"
            });
        }
    };

    const getPlaceholder = (type: string) => {
        if (language === 'octave' && type === 'matrix') {
            return '[1 2 3; 4 5 6]';
        }
        
        if (type.includes('List') || type === 'array' || 
            (type === 'matrix' && language !== 'octave')) {
            return '[1, 2, 3]';
        }
        
        if (type === 'str' || type === 'string') return 'text';
        return '0';
    };

    const formatValue = (value: any): string => {
        if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
            if (language === 'octave') {
                // Format as Octave matrix: [1 2 3; 4 5 6]
                return '[' + value.map(row => row.join(' ')).join('; ') + ']';
            }
        }
        return JSON.stringify(value);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parameters.map((param, index) => (
                    <div key={param.name} className="space-y-2">
                        <Label>{param.name} ({param.type})</Label>
                        <div className="relative">
                            <Input
                                key={`${param.name}-${index}`}
                                value={inputs[index] || ''}
                                onChange={(e) => {
                                    const newInputs = [...inputs];
                                    newInputs[index] = e.target.value;
                                    setInputs(newInputs);
                                }}
                                placeholder={getPlaceholder(param.type)}
                            />
                        </div>
                    </div>
                ))}
                <div className="space-y-2">
                    <Label>Expected Output</Label>
                    <div className="relative">
                        <Input
                            value={output}
                            onChange={(e) => setOutput(e.target.value)}
                            placeholder={parameters.length > 0 ? 
                                getPlaceholder(parameters[0].type) : "Expected output value"}
                        />
                    </div>
                </div>
                <div className="flex items-end">
                    <Button onClick={handleAddTestCase} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Test Case
                    </Button>
                </div>
            </div>
            {error && (
                <div className="text-red-500 text-sm">
                    {error}
                </div>
            )}
            {testCases.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <Label className="text-lg font-semibold mb-4 block">Added Test Cases</Label>
                        <div className="space-y-2">
                            {testCases.map((testCase, index) => (
                                <div 
                                    key={testCase.id} 
                                    className="p-2 bg-secondary rounded flex items-center justify-between"
                                >
                                    <div className="space-x-2">
                                        <Badge variant="outline">Test Case {index + 1}</Badge>
                                        <span className="text-sm">
                                            Inputs: <LatexPreview content={testCase.inputs.map(formatValue).join(', ')} /> 
                                            → Output: <LatexPreview content={formatValue(testCase.output)} />
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `Input: ${testCase.inputs.map(formatValue).join(', ')}\nOutput: ${formatValue(testCase.output)}`
                                                );
                                                toast({
                                                    title: "Copied!",
                                                    description: "Test case copied to clipboard",
                                                });
                                            }}
                                        >
                                            <CopyIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                const newTestCases = testCases.filter(tc => tc.id !== testCase.id);
                                                setTestCases(newTestCases);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
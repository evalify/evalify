import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Language, LANGUAGE_CONFIGS } from "@/lib/programming-languages";
import { TestCaseGenerator } from "../codeEditor/test-case-generator";
import CodeEditor from "../codeEditor/CodeEditor";
import type { CodeFile, TestCase } from "@/types/questions";
import EnhancedEditor from "../codeEditor/enhanced-editor";
import { ClipboardCopy, Share2 } from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import { generateDriverCode } from "@/lib/test-templates";

interface Parameter {
    name: string;
    type: string;
}

interface FunctionDetails {
    functionName: string;
    params: Parameter[];
    returnType: string;
    language: Language;
}

interface CodingQuestionFormProps {
    functionDetails: FunctionDetails;
    onFunctionDetailsChange: (details: FunctionDetails) => void;
    testCases: TestCase[];
    onTestCasesChange: (testCases: TestCase[]) => void;
    boilerplateCode: string;
    onBoilerplateCodeChange: (code: string) => void;
    driverCode: string;
    onDriverCodeChange: (code: string) => void;
    studentAnswer: string;
    onStudentAnswerChange: (code: string) => void;
}

export function CodingQuestionForm({
    functionDetails,
    onFunctionDetailsChange,
    testCases,
    onTestCasesChange,
    boilerplateCode,
    onBoilerplateCodeChange,
    driverCode,
    onDriverCodeChange,
    studentAnswer,
    onStudentAnswerChange,
}: CodingQuestionFormProps) {
    const { toast } = useToast();
    const [paramName, setParamName] = useState("");
    const [paramType, setParamType] = useState("");

    // Add useEffect to sync sample solution with boilerplate and driver code changes
    useEffect(() => {
        const combinedCode = `${boilerplateCode || ""}\n\n${driverCode || ""}`;
        onStudentAnswerChange(combinedCode);
    }, [boilerplateCode, driverCode, onStudentAnswerChange]);

    const handleAddParameter = () => {
        if (paramName && paramType) {
            onFunctionDetailsChange({
                ...functionDetails,
                params: [...functionDetails.params, {
                    name: paramName,
                    type: paramType,
                }],
            });
            setParamName("");
            setParamType("");
        }
    };

    const handleRemoveParameter = (index: number) => {
        onFunctionDetailsChange({
            ...functionDetails,
            params: functionDetails.params.filter((_, i) => i !== index),
        });
    };

    const handleAddTestCase = (testCase: TestCase) => {
        if (!functionDetails.functionName) return;

        const newTestCase = {
            ...testCase,
            id: testCases?.length
                ? (parseInt(testCases[testCases.length - 1].id) + 1).toString()
                : "1",
        };

        // Update test cases which will trigger the driver code generation
        const updatedTestCases = [...(testCases || []), newTestCase];
        onTestCasesChange(updatedTestCases);

        // Generate new driver code
        const newDriverCode = generateDriverCode(
            functionDetails.language,
            functionDetails.functionName,
            updatedTestCases,
        );

        // Update driver code
        onDriverCodeChange(newDriverCode);

        // Update sample solution to include latest changes
        const combinedCode = `${boilerplateCode || ""}\n\n${newDriverCode}`;
        onStudentAnswerChange(combinedCode);
    };

    // Add useEffect to sync test case changes with driver code and sample solution
    useEffect(() => {
        if (functionDetails.functionName && testCases.length > 0) {
            const newDriverCode = generateDriverCode(
                functionDetails.language,
                functionDetails.functionName,
                testCases,
            );
            onDriverCodeChange(newDriverCode);
            const combinedCode = `${boilerplateCode || ""}\n\n${newDriverCode}`;
            onStudentAnswerChange(combinedCode);
        }
    }, [testCases, functionDetails.language, functionDetails.functionName]);

    const generateBoilerplateCode = () => {
        const { language } = functionDetails;
        if (language === "python") {
            return `def ${functionDetails.functionName}(${
                functionDetails.params
                    .map((p) => `${p.name}: ${p.type}`)
                    .join(", ")
            }) -> ${functionDetails.returnType}:
    # Your code here
    pass`;
        } else if (language === "octave") {
            return `function result = ${functionDetails.functionName}(${
                functionDetails.params
                    .map((p) => p.name)
                    .join(", ")
            })
    % Your code here
end`;
        }
        return "";
    };

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast({
                title: "Copied!",
                description: "Code copied to clipboard",
            });
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to copy code",
                variant: "destructive",
            });
        }
    };

    const handleBoilerplateChange = (newCode: string) => {
        onBoilerplateCodeChange(newCode);
        // Update sample solution when boilerplate changes
        const combinedCode = `${newCode || ""}\n\n${driverCode || ""}`;
        onStudentAnswerChange(combinedCode);
    };

    const handleDriverCodeChange = (newCode: string) => {
        onDriverCodeChange(newCode);
        // Update sample solution when driver code changes
        const combinedCode = `${boilerplateCode || ""}\n\n${newCode || ""}`;
        onStudentAnswerChange(combinedCode);
    };

    // Track changes in sample solution
    const handleSolutionChange = (files: CodeFile[]) => {
        if (files[0]) {
            const newContent = files[0].content;
            onStudentAnswerChange(newContent);
            // onBoilerplateCodeChange(newContent.split('\n\n')[0] || ''); // Extract boilerplate part
            // onDriverCodeChange(newContent.split('\n\n')[1] || ''); // Extract driver code part
        }
    };

    return (
        <div className="space-y-6">
            {(functionDetails.language !== "java") && (
                <div>
                    <div className="space-y-2">
                        <Label className="text-lg font-semibold">
                            Function Details
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                placeholder="Function Name"
                                value={functionDetails.functionName}
                                onChange={(e) =>
                                    onFunctionDetailsChange({
                                        ...functionDetails,
                                        functionName: e.target.value,
                                    })}
                            />

                            <Select
                                value={functionDetails.language}
                                onValueChange={(value: Language) => {
                                    onFunctionDetailsChange({
                                        ...functionDetails,
                                        language: value,
                                        returnType: "",
                                    });
                                    setParamType("");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(LANGUAGE_CONFIGS).map((
                                        [key, config],
                                    ) => (
                                        <SelectItem key={key} value={key}>
                                            {config.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={functionDetails.returnType}
                                onValueChange={(value: string) => {
                                    onFunctionDetailsChange({
                                        ...functionDetails,
                                        returnType: value,
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select return type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGE_CONFIGS[functionDetails.language]
                                        ?.types.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-lg font-semibold">
                            Parameters
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                placeholder="Parameter Name"
                                value={paramName}
                                onChange={(e) => setParamName(e.target.value)}
                            />
                            <Select
                                value={paramType}
                                onValueChange={setParamType}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select parameter type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGE_CONFIGS[functionDetails.language]
                                        ?.types.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddParameter}>
                                Add Parameter
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {functionDetails.params.map((param, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="flex items-center gap-1 py-1 px-2"
                                >
                                    {param.name}: {param.type}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={() =>
                                            handleRemoveParameter(index)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-lg font-semibold">
                            Test Cases
                        </Label>
                        <TestCaseGenerator
                            language={functionDetails.language}
                            functionName={functionDetails.functionName}
                            parameters={functionDetails.params}
                            onTestCaseAdd={handleAddTestCase}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">
                            Boilerplate Template
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyCode(boilerplateCode)}
                            >
                                <ClipboardCopy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    handleBoilerplateChange(
                                        generateBoilerplateCode(),
                                    )}
                                size="sm"
                            >
                                Reset Template
                            </Button>
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <EnhancedEditor
                                height="400px"
                                language={functionDetails.language}
                                value={boilerplateCode ||
                                    generateBoilerplateCode()}
                                onChange={handleBoilerplateChange}
                                readonly={false}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">
                            Driver Code
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyCode(driverCode)}
                            >
                                <ClipboardCopy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <EnhancedEditor
                                height="300px"
                                language={functionDetails.language}
                                value={driverCode}
                                onChange={handleDriverCodeChange}
                                readonly={false}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">
                            Sample Solution
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyCode(studentAnswer)}
                            >
                                <ClipboardCopy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <CodeEditor
                                files={[
                                    {
                                        id: "solution",
                                        name: "Solution",
                                        language: functionDetails.language,
                                        content: studentAnswer,
                                    },
                                ]}
                                activeFileId="solution"
                                onFileChange={handleSolutionChange}
                                onActiveFileChange={() => {}}
                                functionDetails={functionDetails}
                                testCases={testCases}
                                showConsole={true}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

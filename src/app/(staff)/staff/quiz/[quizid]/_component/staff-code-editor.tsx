
'use client'

import Editor from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import generatePythonDriverCode from '@/lib/code-generator/driver-code/python'
import generateMatlabDriverCode from '@/lib/code-generator/driver-code/matlab'

interface Props {
    language: string
    functionName: string
    testCases: Array<{ input: string, expectedOutput: string }>
}

export function StaffCodeEditor({ language, functionName, testCases }: Props) {
    const { theme, systemTheme } = useTheme()

    const getMonacoTheme = () => {
        const currentTheme = theme === 'system' ? systemTheme : theme
        return currentTheme === 'dark' ? 'vs-dark' : 'vs-light'
    }

    const getDriverCode = () => {
        const params = { functionName, testCases }
        switch (language.toLowerCase()) {
            case 'python':
                return generatePythonDriverCode(params)
            case 'matlab':
                return generateMatlabDriverCode(params)
            default:
                return `// Driver code generation not implemented for ${language}`
        }
    }

    return (
        <div className="flex flex-col gap-4 h-[600px]">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold">Preview Code Template</h3>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { }}>
                        Copy Code
                    </Button>
                    <Button variant="outline" onClick={() => { }}>
                        Run Tests
                    </Button>
                </div>
            </div>
            <Editor
                height="500px"
                language={language.toLowerCase()}
                theme={getMonacoTheme()}
                value={getDriverCode()}
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                }}
            />
        </div>
    )
}
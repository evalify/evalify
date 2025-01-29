"use client"

import * as React from 'react'
import Editor, { loader } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { EditorToolbar } from './editor-toolbar'
import { EditorTabs } from './editor-tabs'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { nanoid } from 'nanoid'

// Define available Monaco editor themes
const monacoThemes = {
    'vs-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#1e1e1e',
        },
    },
    'github-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#0d1117',
            'editor.foreground': '#c9d1d9',
        },
    },
    'github-light': {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#24292e',
        },
    },
    'slate-dark-blue': {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: '', foreground: 'e5e9f0', background: '0b1e34' }, // Default text
            { token: 'keyword', foreground: '81a1c1', fontStyle: 'bold' }, // Keywords (e.g., `function`, `return`)
            { token: 'string', foreground: 'a3be8c' }, // Strings
            { token: 'number', foreground: 'd08770' }, // Numbers
            { token: 'comment', foreground: '616e88', fontStyle: 'italic' }, // Comments
            { token: 'operator', foreground: '81a1c1' }, // Operators
            { token: 'variable', foreground: 'd8dee9' }, // Variables
            { token: 'type', foreground: '8fbcbb', fontStyle: 'italic' }, // Types
            { token: 'function', foreground: '88c0d0' }, // Function names
            { token: 'class', foreground: '5e81ac', fontStyle: 'bold' }, // Classes
            { token: 'identifier', foreground: 'd8dee9' }, // Identifiers,
            { token: 'builtin', foreground: 'FFA500' }, // Built-in functions
        ],
        colors: {
            'editor.background': '#030d1a', // Deep dark blue
            'editor.foreground': '#d8dee9', // Light slate for default text
            'editorCursor.foreground': '#88c0d0', // Cursor
            'editorLineNumber.foreground': '#4c566a', // Line numbers
            'editorLineNumber.activeForeground': '#d8dee9', // Active line number
            'editor.selectionBackground': '#3b4252', // Selected text
            'editor.selectionHighlightBackground': '#434c5e', // Highlighted selection
            'editor.wordHighlightBackground': '#2e3440', // Word highlight
            'editorIndentGuide.background': '#2e3440', // Indent guide
            'editorIndentGuide.activeBackground': '#4c566a', // Active indent guide
            'editorBracketMatch.background': '#2e3440', // Bracket match background
            'editorBracketMatch.border': '#88c0d0', // Bracket match border
        },
    },

}

interface CodeFile {
    id: string
    name: string
    language: string
    content: string
}

interface CodeEditorProps {
    files: CodeFile[];
    activeFileId: string;
    onFileChange: (files: CodeFile[]) => void;
    onActiveFileChange: (fileId: string) => void;
}

class EditorErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch() {
        // You can log the error here
    }

    render() {
        if (this.state.hasError) {
            return null // Silently recover
        }

        return this.props.children
    }
}

export function CodeEditor({ files, activeFileId, onFileChange, onActiveFileChange }: CodeEditorProps) {
    const functions = [
        'abs', 'angle', 'asin', 'acos', 'atan', 'atan2', 'cos', 'sin', 'tan', 'cosh', 'sinh', 'tanh', 'exp',
        'log', 'log10', 'sqrt', 'sum', 'prod', 'mean', 'std', 'var', 'max', 'min', 'rand', 'randn', 'round',
        'floor', 'ceil', 'mod', 'rem', 'inv', 'det', 'eig', 'svd', 'rank', 'pinv', 'lu', 'qr', 'cholesky',
        'rcond', 'norm', 'cross', 'dot', 'conv', 'deconv', 'poly', 'roots', 'conv2', 'filter', 'filtfilt',
        'fft', 'ifft', 'fft2', 'ifft2', 'fftn', 'ifftn', 'fftshift', 'ifftshift', 'linsolve', 'mldivide',
        'mrdivide', 'ldivide', 'rdivide', 'times', 'power', 'plus', 'minus', 'eq', 'ne', 'lt', 'le', 'gt',
        'ge', 'and', 'or', 'xor', 'not', 'isempty', 'isnan', 'isinf', 'islogical', 'ischar', 'isnumeric',
        'isreal', 'isvector', 'ismatrix', 'iscolumn', 'isrow', 'isprime', 'gcd', 'lcm', 'factor', 'unique',
        'sort', 'sortrows', 'setdiff', 'intersect', 'union', 'diff', 'linspace', 'logspace', 'meshgrid',
        'ndgrid', 'find', 'findobj', 'length', 'size', 'numel', 'hist', 'scatter', 'plot', 'plot3', 'surf',
        'mesh', 'contour', 'hold', 'grid', 'xlabel', 'ylabel', 'zlabel', 'title', 'legend', 'subplot', 'gca',
        'gcf', 'get', 'set', 'axis', 'clc', 'clear', 'close', 'disp', 'fprintf', 'pause', 'warning', 'error',
        'tic', 'toc', 'reshape', 'repmat', 'transpose', 'cat', 'nan', 'nanmean', 'nansum', 'nanstd', 'nanvar',
        'isfinite', 'logical', 'double', 'single', 'char', 'cell', 'struct', 'fieldnames', 'setfield',
        'rmfield', 'cellfun', 'arrayfun', 'parfeval', 'inputdlg', 'msgbox', 'uigetfile', 'uiputfile',
        'uiselect', 'uifigure', 'uisetcolor', 'uigetdir'
    ];

    const [showOutput, setShowOutput] = React.useState(false)
    const [output, setOutput] = React.useState("")
    const [isVertical, setIsVertical] = React.useState(true)
    const { theme, systemTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const editorRef = React.useRef(null)
    const [isFullscreen, setIsFullscreen] = React.useState(false)

    const activeFile = files.find(file => file.id === activeFileId) || files[0]

    React.useEffect(() => {
        setMounted(true)

        // Initialize Monaco editor
        loader.init().then((monaco) => {
            // Register Octave language
            monaco.languages.register({ id: 'octave' });
            monaco.languages.setMonarchTokensProvider('octave', {
                tokenizer: {
                    root: [
                        [/%.*$/, 'comment'],
                        [/"([^"\\]|\\.)*$/, 'string.invalid'],
                        [/"/, { token: 'string.quote', next: '@string' }],
                        [/\b(function|end|if|else|elseif|while|for|end|break|continue)\b/, 'keyword'],
                        [/\d+(\.\d+)?/, 'number'],
                        [/[=+\-.*/^~<>]/, 'operator'],
                    ],
                    string: [
                        [/[^"]+/, 'string'],
                        [/"/, { token: 'string.quote', next: '@pop' }],
                    ],
                },
                builtin: functions
            });
        });
    }, [functions]);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // Register themes and completion provider
        Object.entries(monacoThemes).forEach(([themeName, themeData]) => {
            monaco.editor.defineTheme(themeName, themeData);
        });
        monaco.editor.setTheme(getMonacoTheme());

        monaco.languages.setLanguageConfiguration('octave', {
            comments: {
                lineComment: '%',
                blockComment: ['%{', '%}']
            },
            brackets: [['{', '}'], ['[', ']'], ['(', ')']],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: "'", close: "'", notIn: ['string', 'comment'] },
                { open: '"', close: '"', notIn: ['string', 'comment'] },
            ],
        });

        monaco.languages.registerCompletionItemProvider('octave', {
            provideCompletionItems: () => ({
                suggestions: functions.map(func => ({
                    label: func,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: `${func}(${func === 'rand' || func === 'randn' ? '' : '${1:arg}'}${func === 'plot' ? ', ${2:arg}' : ''})`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                }))
            })
        });
    };

    const runCode = async () => {
        try {
            const response = await fetch('/api/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_code: activeFile.content,
                    language: activeFile.language
                })
            })
            const data = await response.json()
            setOutput(data.stdout || data.stderr || data.error)
            setShowOutput(true)
        } catch (error) {
            setOutput('Error executing code')
            setShowOutput(true)
        }
    }

    const handleShare = () => {
        // Implement share functionality
        console.log('Share clicked')
    }

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                setIsFullscreen(false)
            }
        }
    }

    const handleClear = () => {
        onFileChange(files.map(file =>
            file.id === activeFileId ? { ...file, content: '' } : file
        ))
        setOutput("")
    }

    const toggleOrientation = () => {
        setIsVertical(!isVertical)
    }

    const handleLanguageChange = (language: string) => {
        onFileChange(files.map(file =>
            file.id === activeFileId ? { ...file, language } : file
        ))
    }

    const handleNewFile = () => {
        const newFile: CodeFile = {
            id: nanoid(),
            name: `file${files.length + 1}`,
            language: 'octave',
            content: ''
        }
        onFileChange([...files, newFile])
        onActiveFileChange(newFile.id)
    }

    const handleTabChange = (tabId: string) => {
        onActiveFileChange(tabId)
    }

    const handleTabClose = (tabId: string) => {
        if (files.length > 1) {
            const newFiles = files.filter(file => file.id !== tabId)
            onFileChange(newFiles)
            if (activeFileId === tabId) {
                onActiveFileChange(newFiles[0].id)
            }
        }
    }

    // Determine which Monaco theme to use
    const getMonacoTheme = () => {
        if (!mounted) return 'github-light'
        const currentTheme = theme === 'system' ? systemTheme : theme
        return currentTheme === 'dark' ? 'slate-dark-blue' : 'github-light'
    }

    if (!mounted) {
        return <div className="flex h-full items-center justify-center">Loading editor...</div>
    }

    return (
        <div className={`flex bg-background border-2 rounded-xl px-2 ${isFullscreen ? 'fixed inset-0 z-50 min-h-screen' : 'h-[89vh]'}`}>
            <div className="flex-1 flex flex-col">
                <EditorToolbar
                    onRun={runCode}
                    onShare={handleShare}
                    onFullscreen={handleFullscreen}
                    showOutput={showOutput}
                    onToggleOutput={() => setShowOutput(!showOutput)}
                    onClear={handleClear}
                    isVertical={isVertical}
                    onToggleOrientation={toggleOrientation}
                    language={activeFile.language}
                    onLanguageChange={handleLanguageChange}
                />
                <EditorTabs
                    tabs={files}
                    activeTab={activeFileId}
                    onTabChange={handleTabChange}
                    onTabClose={handleTabClose}
                    onNewFile={handleNewFile}
                />
                <EditorErrorBoundary>
                    <ResizablePanelGroup
                        key={isVertical ? 'vertical' : 'horizontal'} // Force remount when direction changes
                        direction={isVertical ? "horizontal" : "vertical"}
                        className="flex-1 border-t"
                    >
                        <ResizablePanel defaultSize={75} minSize={30}>
                            <Editor
                                height="100%"
                                language={activeFile.language}
                                value={activeFile.content}
                                onChange={(value) => {
                                    onFileChange(files.map(file =>
                                        file.id === activeFileId ? { ...file, content: value || '' } : file
                                    ))
                                }}
                                theme={getMonacoTheme()}
                                options={{
                                    fontSize: 16,
                                    fontFamily: 'JetBrains Mono',
                                    minimap: { enabled: false },
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    lineNumbers: 'on',
                                    automaticLayout: true,
                                    padding: { top: 16 },
                                    suggest: {
                                        showKeywords: true,
                                    },
                                }}
                                onMount={handleEditorDidMount}
                                loading={
                                    <div className="flex h-full items-center justify-center">
                                        Loading...
                                    </div>
                                }
                            />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={25} minSize={20} >
                            <div className="h-full overflow-auto p-4 border-l">
                                <pre className="font-mono text-sm whitespace-pre-wrap">
                                    {output || 'No output yet'}
                                </pre>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </EditorErrorBoundary>
            </div>
        </div>
    )
}

export default CodeEditor


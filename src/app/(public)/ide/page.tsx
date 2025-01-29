"use client"
import React, { useState } from 'react'

import CodeEditor from '../../../components/codeEditor/CodeEditor';
import { nanoid } from 'nanoid';

interface CodeFile {
    id: string
    name: string
    language: string
    content: string
}

function IDE() {
    const [editorFiles, setEditorFiles] = useState<CodeFile[]>([
        { id: nanoid(), name: 'file', language: 'octave', content: '' }
    ]);
    const [activeEditorFile, setActiveEditorFile] = useState(editorFiles[0].id);
    return (
        <div>
            <CodeEditor
                files={editorFiles}
                activeFileId={activeEditorFile}
                onFileChange={setEditorFiles}
                onActiveFileChange={setActiveEditorFile}
            />
        </div>
    )
}

export default IDE
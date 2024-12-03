'use client'

import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

interface LatexPreviewProps {
    content: string;
}

export function LatexPreview({ content }: LatexPreviewProps) {
    const parts = content.split(/(\$.*?\$)/g);

    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    const latex = part.slice(1, -1);
                    return <InlineMath key={index} math={latex} />;
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}
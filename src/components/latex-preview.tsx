'use client'

import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { decodeLatex } from '@/utils/latex';

interface LatexPreviewProps {
    content: string;
}

export function LatexPreview({ content }: LatexPreviewProps) {
    const parts = content.split(/(\$[^$]+\$)/g);

    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    const latex = decodeLatex(part.slice(1, -1));
                    return (
                        <span key={index} className="inline-block mx-1">
                            <InlineMath math={latex} />
                        </span>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}
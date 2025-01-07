import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface PreviewProps {
    content: string;
    className?: string;
}

export function Preview({ content, className }: PreviewProps) {
    return (
        <div className={cn(
            "prose dark:prose-invert max-w-none",
            "prose-img:rounded-md prose-img:border prose-img:shadow-sm",
            "prose-img:max-h-96 prose-img:mx-auto prose-img:object-contain",
            "prose-pre:bg-muted prose-pre:p-4",
            className
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Override p tag when it contains an image
                    p: ({ children, ...props }) => {
                        const containsImage = React.Children.toArray(children).some(
                            child => React.isValidElement(child) && child.type === 'img'
                        );
                        
                        if (containsImage) {
                            return <div {...props}>{children}</div>;
                        }
                        return <p {...props}>{children}</p>;
                    },
                    img: ({ node, ...props }) => (
                        <img
                            {...props}
                            loading="lazy"
                            alt={props.alt || 'Image'}
                        />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

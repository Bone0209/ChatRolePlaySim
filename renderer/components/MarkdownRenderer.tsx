'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
}

const components: Components = {
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-amber-300">{children}</strong>,
    em: ({ children }) => <em className="italic text-gray-400">{children}</em>,
    h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
};

// Helper to normalize Markdown for better compatibility
// Convert __bold__ to **bold** because standard Markdown parsers often ignore 
// underscores for intraword emphasis (especially in CJK without spaces).
const preprocessContent = (text: string): string => {
    // 1. Remove Japanese dialogue brackets 「」
    let processed = text.replace(/[「」]/g, '');

    // 2. Replace __text__ with **text** (standardize intraword bold)
    processed = processed.replace(/__([^\s_][^_\n]*[^\s_]|[^\s_])__/g, '**$1**');

    // 3. Ensure distinct blocks for italics (psychological descriptions)
    // Force double newline after an italic block if followed by text on new line
    processed = processed.replace(/(\*+)\n(?=[^\n])/g, '$1\n\n');
    // Force double newline before an italic block if preceded by text on new line
    processed = processed.replace(/([^\n])\n(\*+)/g, '$1\n\n$2');

    return processed;
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const processedContent = preprocessContent(content);
    return (
        <div className="markdown-content text-sm leading-relaxed text-inherit">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly, remarkBreaks]} components={components}>
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}

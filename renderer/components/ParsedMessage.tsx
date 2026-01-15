
import React from 'react';

interface ParsedSegment {
    type: 'act' | 'msg' | 'scene' | 'text';
    content: string;
}

interface ParsedMessageProps {
    content: string;
}

const ParsedMessage: React.FC<ParsedMessageProps> = ({ content }) => {
    // Parse the content into segments
    const parseContent = (text: string): ParsedSegment[] => {
        const segments: ParsedSegment[] = [];

        // Regex to match tags: <tag>content</tag>
        // Use capturing groups for tag name and content
        // Removed 'emo' from regex as per user request
        const regex = /<(act|msg|scene)>([\s\S]*?)<\/\1>/gi;

        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Add any text before the match as plain text (if any legitimate text exists)
            // But usually we ignore whitespace/newlines between tags if fully strict.
            // Let's be safe and ignore whitespace-only strings between tags.
            const preMatch = text.slice(lastIndex, match.index);
            if (preMatch.trim()) {
                segments.push({ type: 'text', content: preMatch.trim() });
            }

            const tagType = match[1].toLowerCase() as ParsedSegment['type'];
            const tagContent = match[2].trim();

            segments.push({ type: tagType, content: tagContent });
            lastIndex = regex.lastIndex;
        }

        // Add remaining text
        const postMatch = text.slice(lastIndex);
        if (postMatch.trim()) {
            segments.push({ type: 'text', content: postMatch.trim() });
        }

        // If no tags found, treat huge block as text (or msg fallback?)
        // If it starts with plain text but has tags later, 'text' type handles it.
        // If completely no tags, return as text.
        if (segments.length === 0 && text.trim()) {
            return [{ type: 'text', content: text.trim() }];
        }

        return segments;
    };

    const segments = parseContent(content);

    // Group adjacent segments to handle interleaved meta-blocks correctly
    const groupedSegments: { type: 'meta' | 'text', items: ParsedSegment[] }[] = [];

    let currentGroup: { type: 'meta' | 'text', items: ParsedSegment[] } | null = null;

    segments.forEach(seg => {
        const isMeta = ['act', 'scene'].includes(seg.type); // Removed emo
        const groupType = isMeta ? 'meta' : 'text';

        if (!currentGroup || currentGroup.type !== groupType) {
            currentGroup = { type: groupType, items: [seg] };
            groupedSegments.push(currentGroup);
        } else {
            currentGroup.items.push(seg);
        }
    });

    return (
        <div className="flex flex-col gap-3 w-full">
            {groupedSegments.map((group, gIndex) => {
                if (group.type === 'meta') {
                    // Render meta block (Act, Scene) - Clean Novel Style
                    // Removed background boxes and internal padding. Used color/italics for distinction.
                    return (
                        <div key={gIndex} className="text-sm text-indigo-300/90 italic leading-relaxed tracking-wide">
                            {group.items.map((item, i) => (
                                <span key={i} className="block">
                                    {item.type === 'act' && (
                                        <span>{item.content.trim()}</span> // Added trim here too just in case
                                    )}
                                    {item.type === 'scene' && (
                                        <span>{item.content.trim()}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    );
                } else {
                    // Render text block (Msg or plain text)
                    // Clean Novel Style: No extra padding, let parent container handle it.
                    return (
                        <div key={gIndex} className="flex flex-col gap-2">
                            {group.items.map((item, i) => (
                                <span key={i} className="text-base text-zinc-100 leading-relaxed whitespace-pre-wrap block">
                                    {item.content.replace(/^[\s\u3000\u00A0\u2000-\u200B]+/, '').trimEnd()}
                                </span>
                            ))}
                        </div>
                    );
                }
            })}
        </div>
    );
};

export default ParsedMessage;

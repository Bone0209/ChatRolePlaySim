
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

        // Regex for BOTH legacy XML-like tags and new Square Bracket tags
        // Match:
        // 1. <tag>content</tag>
        // 2. [tag:param?] content (until next tag or end) - Wait, regex for stream format is harder purely with replace/exec loop if tags define blocks until next tag.
        // Let's assume the input `content` might be a mix or purely new format.
        // The new format is "Block based".

        // Strategy: Split by block headers?
        // New format headers: `[(narrative|speech|announce|event|log|act|scene)(?::(.*?))?]`
        // Note: New format usually has newlines after tags.

        // Let's try to detect if we are in "Block Mode" (new) or "Tag Mode" (old).
        // If content contains `[narrative]` etc., treat as block mode?
        // But `ParsedMessage` handles a single "Displayable string".

        // Unified Regex:
        // Group 1: Legacy Tag Name
        // Group 2: Legacy Content
        // Group 3: New Tag Name
        // Group 4: New Tag Param
        // The content for New Tag is everything until next New Tag. (Lookahead?)

        // Simpler approach: Split string by Block Tags, then parse Legacy Tags within segments?
        // Or just iterate.

        // Let's iterate.
        // Regex to find ANY start tag.

        const blockTagRegex = /\[(narrative|speech|announce|event|log|act|scene)(?::(.*?))?\]/gi;

        // Check if we have block tags.
        if (blockTagRegex.test(text)) {
            // Block Mode parsing
            let lastIndex = 0;
            blockTagRegex.lastIndex = 0;
            let match;

            // Initial text before first tag
            const firstMatch = blockTagRegex.exec(text);
            if (firstMatch && firstMatch.index > 0) {
                segments.push({ type: 'text', content: text.substring(0, firstMatch.index).trim() });
            }

            // Reset regex
            blockTagRegex.lastIndex = firstMatch ? firstMatch.index : 0;

            while ((match = blockTagRegex.exec(text)) !== null) {
                const tagName = match[1].toLowerCase();
                const param = match[2]; // name etc
                const startIndex = match.index + match[0].length;

                // Find next tag to define end of this block
                const nextTagMatch = text.substring(startIndex).search(/\[(narrative|speech|announce|event|log|act|scene)(?::(.*?))?\]/i);

                let contentEndIndex = text.length;
                if (nextTagMatch !== -1) {
                    contentEndIndex = startIndex + nextTagMatch;
                }

                let segmentContent = text.substring(startIndex, contentEndIndex).trim();

                // Map tag to visual type
                // narrative -> scene/meta
                // speech -> text (ignore name param in body, assumed handled by UI or just text)
                // announce -> meta/announce?

                let type: ParsedSegment['type'] = 'text';

                if (tagName === 'narrative' || tagName === 'scene' || tagName === 'act') {
                    type = 'scene';
                } else if (tagName === 'announce') {
                    type = 'act';
                    // Interface ParsedSegment only has 'act' | 'msg' | 'scene' | 'text' currently.
                    // Let's map announce to 'act' (which is rendered as italic/colored).
                    // Or reuse 'scene'.
                    // 'act' was usually short actions.
                    // Let's stick to 'scene' for narrative and 'text' for speech.
                    // Announce might need bold.
                    // Let's modify the interface if needed, but for now map to 'act' and we will style act better?
                    // Spec says Announce: Centered, emphasized.
                    // Existing 'act' style in this file: "text-indigo-300/90 italic" (Grouped as meta)
                } else if (tagName === 'log' || tagName === 'event') {
                    // Skip hidden blocks
                    // blockTagRegex found the header. We need to skip the content too.
                    // The loop logic finds contentEndIndex.
                    // We just don't push to segments.

                    // Advance regex
                    blockTagRegex.lastIndex = contentEndIndex;
                    continue;
                }

                segments.push({ type: type, content: segmentContent });

                // Advance regex manually to end of content?
                // No, exec loop does it if we don't mess with lastIndex.
                // But we matched the *header*. The content is skipped by regex.
                // We need to set lastIndex to contentEndIndex.
                blockTagRegex.lastIndex = contentEndIndex;
            }
            return segments;
        }

        // Fallback to Legacy Regex for <tags>
        const legacyRegex = /<(act|msg|scene)>([\s\S]*?)<\/\1>/gi;
        let lastIndex = 0;
        let match;

        while ((match = legacyRegex.exec(text)) !== null) {
            const preMatch = text.slice(lastIndex, match.index);
            if (preMatch.trim()) {
                segments.push({ type: 'text', content: preMatch.trim() });
            }

            const tagType = match[1].toLowerCase() as ParsedSegment['type'];
            const tagContent = match[2].trim();

            segments.push({ type: tagType, content: tagContent });
            lastIndex = legacyRegex.lastIndex;
        }

        const postMatch = text.slice(lastIndex);
        if (postMatch.trim()) {
            segments.push({ type: 'text', content: postMatch.trim() });
        }

        if (segments.length === 0 && text.trim()) {
            return [{ type: 'text', content: text.trim() }];
        }

        return segments;
    };

    const segments = parseContent(content);

    // Group adjacent segments
    const groupedSegments: { type: 'meta' | 'text', items: ParsedSegment[] }[] = [];
    let currentGroup: { type: 'meta' | 'text', items: ParsedSegment[] } | null = null;

    segments.forEach(seg => {
        // Map types to groups
        // scene, act -> meta
        // text, msg -> text
        const isMeta = ['act', 'scene'].includes(seg.type);
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
                    return (
                        <div key={gIndex} className="text-sm text-indigo-300/90 italic leading-relaxed tracking-wide">
                            {group.items.map((item, i) => (
                                <span key={i} className={`block ${item.type === 'act' ? 'font-bold text-center not-italic text-indigo-200 border-y border-white/10 py-1 my-1' : ''}`}>
                                    {/* Special styling for 'act' mapped from [announce] */}
                                    {item.content}
                                </span>
                            ))}
                        </div>
                    );
                } else {
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

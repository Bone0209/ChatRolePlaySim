import { EventEmitter } from 'events';

export type BlockType = string;

export interface BlockStart {
    type: BlockType;
    name?: string; // For parameterized blocks like speech
    originalTag: string;
}

export interface TagConfig {
    tag: string;
    parameterized: boolean; // true if tag expects ":value" suffix (e.g. speech:name)
}

export type StreamParserConfig = Record<BlockType, TagConfig>;

export class StreamParser extends EventEmitter {
    private state: 'WAITING_TAG' | 'READING_TAG' | 'SKIP_NEWLINE' | 'READING_CONTENT' = 'WAITING_TAG';
    private tagBuffer: string = '';
    private currentBlock: BlockStart | null = null;
    private config: StreamParserConfig;

    constructor(config: StreamParserConfig) {
        super();
        this.config = config;
    }

    public process(chunk: string): void {
        for (let i = 0; i < chunk.length; i++) {
            const char = chunk[i];
            this.processChar(char);
        }
    }

    private processChar(char: string): void {
        switch (this.state) {
            case 'WAITING_TAG':
                if (char === '[') {
                    this.state = 'READING_TAG';
                    this.tagBuffer = '';
                } else {
                    // Ignore chars before first tag
                }
                break;

            case 'READING_TAG':
                if (char === ']') {
                    this.parseTag(this.tagBuffer);
                    this.state = 'SKIP_NEWLINE';
                } else {
                    this.tagBuffer += char;
                }
                break;

            case 'SKIP_NEWLINE':
                if (char === '\n' || char === '\r') {
                    if (char === '\n') {
                        this.state = 'READING_CONTENT';
                    }
                } else if (char === '[') {
                    this.state = 'READING_TAG';
                    this.tagBuffer = '';
                } else {
                    this.state = 'READING_CONTENT';
                    this.emit('data', char);
                }
                break;

            case 'READING_CONTENT':
                if (char === '[') {
                    this.state = 'READING_TAG';
                    this.tagBuffer = '';
                } else {
                    this.emit('data', char);
                }
                break;
        }
    }

    private parseTag(rawTag: string): void {
        const lowerTag = rawTag.toLowerCase().trim();
        let type: BlockType = 'unknown';
        let name: string | undefined = undefined;

        for (const [blockType, tagConfig] of Object.entries(this.config)) {
            const configTag = tagConfig.tag.toLowerCase();

            if (tagConfig.parameterized) {
                if (lowerTag.startsWith(configTag + ':')) {
                    type = blockType;
                    // Extract value after the tag and colon
                    // Note: rawTag might have different casing than lowerTag
                    // find index of ':' in rawTag to preserve name casing
                    const separatorIndex = rawTag.indexOf(':');
                    if (separatorIndex !== -1) {
                        name = rawTag.substring(separatorIndex + 1).trim();
                    }
                    break;
                }
            } else {
                if (lowerTag === configTag) {
                    type = blockType;
                    break;
                }
                // Maintain fallback for "narrator" -> "narrative" alias if desired, 
                // but generally DB config should handle aliases by adding multiple entries if needed.
                // However, user asked for flexibility. 
                // We'll stick to strict logic: DB definitions drive the parser.
            }
        }

        // Manual fallback for backward compatibility if configured (optional)
        // If "narrative" is configured but input says "narrator", strict matching fails.
        // Assuming user will configure "narrative" in DB.

        const blockStart: BlockStart = {
            type,
            name,
            originalTag: rawTag
        };

        this.currentBlock = blockStart;
        this.emit('start', blockStart);
    }
}

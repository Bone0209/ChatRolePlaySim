import { describe, it } from 'node:test';
import { StreamParser, BlockStart, StreamParserConfig } from '../main/utils/StreamParser';
import assert from 'assert';

const mockConfig: StreamParserConfig = {
    'narrative': { tag: 'narrative', parameterized: false },
    'speech': { tag: 'speech', parameterized: true },
    'event': { tag: 'event', parameterized: false },
    'log': { tag: 'log', parameterized: false }
};

describe('StreamParser', () => {
    it('should parse single line narrative', () => {
        const parser = new StreamParser(mockConfig);
        const input = '[narrative]Hello World';
        let output = '';
        let blockInfo: BlockStart | null = null;

        parser.on('start', (block: BlockStart) => {
            blockInfo = block;
        });
        parser.on('data', (chunk) => {
            output += chunk;
        });

        parser.process(input);

        assert.ok(blockInfo);
        const info = blockInfo as BlockStart;
        assert.equal(info.type, 'narrative');
        assert.equal(output, 'Hello World');
    });

    it('should parse speech with name', () => {
        const parser = new StreamParser(mockConfig);
        const input = '[speech:Aria]Hello there';
        let output = '';
        let blockInfo: BlockStart | null = null;

        parser.on('start', (block: BlockStart) => {
            blockInfo = block;
        });
        parser.on('data', (chunk) => {
            output += chunk;
        });

        parser.process(input);

        assert.ok(blockInfo);
        const info = blockInfo as BlockStart;
        assert.equal(info.type, 'speech');
        assert.equal(info.name, 'Aria');
        assert.equal(output, 'Hello there');
    });

    it('should handle multi-line content and skip initial newline', () => {
        const parser = new StreamParser(mockConfig);
        const input = '[narrative]\nLine 1\nLine 2';
        let output = '';

        parser.on('data', (chunk) => {
            output += chunk;
        });

        parser.process(input);

        // Initial newline should be skipped
        assert.equal(output, 'Line 1\nLine 2');
    });

    it('should handle multiple blocks in one stream', () => {
        const parser = new StreamParser(mockConfig);
        const input = '[narrative]Start[speech:Bob]Hey[event]Stop';

        const blocks: BlockStart[] = [];
        const contents: string[] = [];
        let currentContent = '';

        parser.on('start', (block: BlockStart) => {
            if (currentContent) {
                contents.push(currentContent);
                currentContent = '';
            }
            blocks.push(block);
        });
        parser.on('data', (c) => currentContent += c);

        parser.process(input);
        if (currentContent) contents.push(currentContent);

        assert.equal(blocks.length, 3);
        assert.equal(blocks[0].type, 'narrative');
        assert.equal(blocks[1].type, 'speech');
        assert.equal(blocks[1].name, 'Bob');
        assert.equal(blocks[2].type, 'event');

        assert.equal(contents[0], 'Start');
        assert.equal(contents[1], 'Hey');
        assert.equal(contents[2], 'Stop');
    });

    it('should handle fragmented chunks', () => {
        const parser = new StreamParser(mockConfig);
        const chunks = ['[narra', 'tive]He', 'llo'];

        let blockInfo: BlockStart | null = null;
        let output = '';

        parser.on('start', (b: BlockStart) => blockInfo = b);
        parser.on('data', (c) => output += c);

        chunks.forEach(c => parser.process(c));

        assert.ok(blockInfo);
        const info = blockInfo as BlockStart;
        assert.equal(info.type, 'narrative');
        assert.equal(output, 'Hello');
    });

    it('should handle [event] special char like :', () => {
        const parser = new StreamParser(mockConfig);
        const input = '[event]bgm:stop';
        let eventContent = '';

        parser.on('start', (b: BlockStart) => {
            assert.equal(b.type, 'event');
        });
        parser.on('data', (c) => eventContent += c);

        parser.process(input);
        assert.equal(eventContent, 'bgm:stop');
    });

    it('should handle unknown tags', () => {
        const parser = new StreamParser(mockConfig);
        const input = '[unknown]Foo';
        let blockInfo: BlockStart | null = null;

        parser.on('start', (b: BlockStart) => blockInfo = b);
        parser.process(input);

        assert.ok(blockInfo);
        const info = blockInfo as BlockStart;
        assert.equal(info.type, 'unknown');
        assert.equal(info.originalTag, 'unknown');
    });

    it('should support dynamic new tags', () => {
        const dynamicConfig: StreamParserConfig = {
            ...mockConfig,
            'whisper': { tag: 'whisper', parameterized: true }
        };
        const parser = new StreamParser(dynamicConfig);
        const input = '[whisper:Ghost]Boo';
        let blockInfo: BlockStart | null = null;

        parser.on('start', (b: BlockStart) => blockInfo = b);
        parser.process(input);

        assert.ok(blockInfo);
        const info = blockInfo as BlockStart;
        assert.equal(info.type, 'whisper');
        assert.equal(info.name, 'Ghost');
    });
});

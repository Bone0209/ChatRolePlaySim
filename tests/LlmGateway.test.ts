import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { LlmGateway } from '../main/infrastructure/gateways/LlmGateway';

// Mock fetch globally
const mockFetch: any = mock.fn(async () => { });
global.fetch = mockFetch;

describe('LlmGateway', () => {
    it('should generate stream correctly', async () => {
        const gateway = new LlmGateway();

        // Mock SSE response
        const streamData = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
            'data: [DONE]\n\n'
        ];

        // Create an async iterable for the body
        async function* streamGenerator() {
            for (const chunk of streamData) {
                yield Buffer.from(chunk);
            }
        }

        mockFetch.mock.mockImplementationOnce(() => {
            return Promise.resolve({
                ok: true,
                body: streamGenerator() // Node.js style body
            }) as any;
        });

        const messages: any[] = [{ role: 'user', content: 'Hi' }];
        const generator = gateway.generateStream(messages);

        let result = '';
        for await (const chunk of generator) {
            result += chunk;
        }

        assert.equal(result, 'Hello World');
    });

    it('should handle errors in stream', async () => {
        const gateway = new LlmGateway();

        mockFetch.mock.mockImplementationOnce(() => {
            return Promise.resolve({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal Server Error')
            }) as any;
        });

        const messages: any[] = [{ role: 'user', content: 'Hi' }];

        try {
            const generator = gateway.generateStream(messages);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of generator) {
                // Should not reach here
            }
            assert.fail('Should have thrown error');
        } catch (e: any) {
            assert.ok(e.message.includes('LLM API Error (500)'));
        }
    });
});

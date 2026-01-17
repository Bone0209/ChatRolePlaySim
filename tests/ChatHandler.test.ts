import { describe, it, mock } from 'node:test';
import { strict as assert } from 'assert';
import { ipcMain } from 'electron';
import { registerChatHandler } from '../main/interface-adapters/ipc/ChatHandler';

// Mock dependencies
const mockSendPlayerUC = {
    execute: mock.fn(async () => { })
} as any;

const mockGenerateNpcUC = {
    execute: mock.fn(async (args: any) => {
        // Simulate streaming
        if (args.onProgress) {
            args.onProgress({ type: 'block:start', data: { type: 'narrative' } });
            args.onProgress({ type: 'block:data', data: 'Hello' });
        }
        return 'Hello';
    })
} as any;

const mockRepo = {} as any;

// Mock ipcMain
const handlers: Record<string, Function> = {};
const mockIpcMain = {
    handle: mock.fn((channel, handler) => {
        handlers[channel] = handler;
    })
};

// Stub electron import not needed since we inject mock
// mock.module('electron', {
//     namedExports: {
//         ipcMain: mockIpcMain
//     }
// });

describe('ChatHandler', () => {
    it('should register handler and emit stream events', async () => {
        // Inject mocks
        registerChatHandler(mockSendPlayerUC, mockGenerateNpcUC, mockRepo, mockRepo, mockRepo, mockIpcMain as any);

        assert.ok(mockIpcMain.handle.mock.calls.length > 0);
        assert.ok(handlers['chat']);

        // Simulate IPC call
        const mockSender = { send: mock.fn() };
        const mockEvent = { sender: mockSender };
        const params = { worldId: 'w1', message: 'test', targetId: 'npc1' };

        await handlers['chat'](mockEvent, params);

        // Verify executions
        assert.equal(mockSendPlayerUC.execute.mock.calls.length, 1);
        assert.equal(mockGenerateNpcUC.execute.mock.calls.length, 1);

        // Verify stream events emitted
        const sendCalls = mockSender.send.mock.calls;
        assert.ok(sendCalls.length >= 2);

        assert.equal(sendCalls[0].arguments[0], 'chat:stream');
        assert.deepEqual(sendCalls[0].arguments[1], { worldId: 'w1', type: 'block:start', data: { type: 'narrative' } });

        assert.equal(sendCalls[1].arguments[0], 'chat:stream');
        assert.deepEqual(sendCalls[1].arguments[1], { worldId: 'w1', type: 'block:data', data: 'Hello' });
    });
});

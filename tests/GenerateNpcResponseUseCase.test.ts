import { describe, it, mock } from 'node:test';
import { strict as assert } from 'assert';
import { GenerateNpcResponseUseCase } from '../main/application/usecases/chat/GenerateNpcResponseUseCase';
import { IChatRepository } from '../main/domain/repositories/IChatRepository';
import { IEntityRepository } from '../main/domain/repositories/IEntityRepository';
import { IWorldRepository } from '../main/domain/repositories/IWorldRepository';
import { LlmGateway } from '../main/infrastructure/gateways/LlmGateway';
import { GlobalConstantRepository } from '../main/domain/repositories/IGlobalConstantRepository';
import { PrismaUserProfileRepository } from '../main/infrastructure/repositories/PrismaUserProfileRepository';

describe('GenerateNpcResponseUseCase', () => {
    it('should stream response and save to DB', async () => {
        // Mocks
        const mockChatRepo = { save: mock.fn() } as unknown as IChatRepository;
        const mockEntityRepo = {
            findById: mock.fn(() => Promise.resolve({
                id: 'npc1', name: 'Aria', description: 'desc', getParameterValue: () => '', getAllParameters: () => ({}), getAffection: () => 0, getLocation: () => 'Loc'
            })),
            findByWorldId: mock.fn(() => Promise.resolve([]))
        } as unknown as IEntityRepository;
        const mockWorldRepo = { findById: mock.fn(() => Promise.resolve({ id: 'w1', worldTime: '12:00' })) } as unknown as IWorldRepository;

        const mockLlmGateway = {
            analyzeAction: mock.fn(() => Promise.resolve({})),
            analyzeAffection: mock.fn(() => Promise.resolve({ affection_delta: 0 })),
            generateStream: async function* () {
                yield '[narrative]';
                yield 'Hello';
                yield '\n';
                yield '[log] internal thought\n';
                yield '[speech:Aria]';
                yield 'Hi';
                yield '[event] battle:start\n';
                yield '[announce] Info';
            }
        } as unknown as LlmGateway;

        const mockUpdateAffection = { execute: mock.fn() } as any;

        const mockProfileRepo = {
            getGlobalSettings: mock.fn(() => Promise.resolve([
                { keyName: 'sys.llm.first.api_key', keyValue: 'key' },
                { keyName: 'sys.llm.first.api_endpoint', keyValue: 'url' },
                { keyName: 'sys.llm.first.model', keyValue: 'model' }
            ])),
            getProfileSettings: mock.fn(() => Promise.resolve([]))
        } as unknown as PrismaUserProfileRepository;

        const mockConstantRepo = {
            getValue: mock.fn((k) => Promise.resolve(
                k === 'CHAT_TAG_NARRATIVE' ? 'narrative' :
                    k === 'CHAT_TAG_ANNOUNCE' ? 'announce' :
                        k === 'CHAT_TAG_EVENT' ? 'event' :
                            k === 'CHAT_TAG_LOG' ? 'log' : 'speech'
            ))
        } as unknown as GlobalConstantRepository;

        const useCase = new GenerateNpcResponseUseCase(
            mockChatRepo, mockEntityRepo, mockWorldRepo, mockLlmGateway, mockUpdateAffection, mockProfileRepo, mockConstantRepo
        );

        const progressEvents: any[] = [];
        const result = await useCase.execute({
            worldId: 'w1',
            message: 'Hello',
            targetId: 'npc1',
            onProgress: (e) => progressEvents.push(e)
        });

        // Verifications
        // Result should contain everything including logs/events (for context)
        assert.ok(result.includes('Hello'));
        assert.ok(result.includes('[log]'));
        assert.ok(result.includes('[event]'));

        // Progress events: should NOT contain log/event
        const eventTypes = progressEvents.map(e => e.type === 'block:start' ? e.data.type : null).filter(t => t);
        assert.ok(!eventTypes.includes('log'));
        assert.ok(!eventTypes.includes('event'));
        assert.ok(eventTypes.includes('narrative'));
        assert.ok(eventTypes.includes('speech'));

        // DB Save check
        // [narrative] -> Hello (CHAT_NPC, Visible)
        // [log] -> internal (CHAT_SYSTEM, Hidden)
        // [speech] -> Hi (CHAT_NPC, Visible)
        // [event] -> battle (CHAT_SYSTEM, Hidden)
        // [announce] -> Info (CHAT_SYSTEM, Visible)

        const calls = (mockChatRepo.save as any).mock.calls;
        // Expected: 5 separate blocks due to interleaving types/visibility
        console.log('Calls:', JSON.stringify(calls.map((c: any) => c.arguments[0]), null, 2));
        assert.equal(calls.length, 5);

        // 1. Narrative
        const msg1 = calls[0].arguments[0];
        assert.equal(msg1.type, 'CHAT_NPC');
        assert.ok(msg1.message.includes('[narrative]'));
        assert.equal(msg1.isVisible, true);

        // 2. Log
        const msg2 = calls[1].arguments[0];
        assert.equal(msg2.type, 'CHAT_SYSTEM');
        assert.ok(msg2.message.includes('[log]'));
        assert.equal(msg2.isVisible, false);

        // 3. Speech
        const msg3 = calls[2].arguments[0];
        assert.equal(msg3.type, 'CHAT_NPC');
        assert.ok(msg3.message.includes('[speech'));
        assert.equal(msg3.isVisible, true);

        // 4. Event
        const msg4 = calls[3].arguments[0];
        assert.equal(msg4.type, 'CHAT_SYSTEM');
        assert.ok(msg4.message.includes('[event]'));
        assert.equal(msg4.isVisible, false);

        // 5. Announce
        const msg5 = calls[4].arguments[0];
        assert.equal(msg5.type, 'CHAT_SYSTEM');
        assert.ok(msg5.message.includes('[announce]'));
        assert.equal(msg5.isVisible, true);
    });
});

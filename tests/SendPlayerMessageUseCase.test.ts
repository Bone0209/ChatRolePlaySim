import { describe, it, mock } from 'node:test';
import { strict as assert } from 'assert';
import { SendPlayerMessageUseCase } from '../main/application/usecases/chat/SendPlayerMessageUseCase';
import { IChatRepository } from '../main/domain/repositories/IChatRepository';
import { IEntityRepository } from '../main/domain/repositories/IEntityRepository';
import { IWorldRepository } from '../main/domain/repositories/IWorldRepository';

describe('SendPlayerMessageUseCase', () => {
    it('should save player message when validation passes', async () => {
        const mockChatRepo = { save: mock.fn() } as unknown as IChatRepository;
        const mockEntityRepo = { findById: mock.fn(() => Promise.resolve({ id: 'npc1' })) } as unknown as IEntityRepository;
        const mockWorldRepo = { findById: mock.fn(() => Promise.resolve({ id: 'w1' })) } as unknown as IWorldRepository;

        const useCase = new SendPlayerMessageUseCase(mockChatRepo, mockEntityRepo, mockWorldRepo);

        await useCase.execute({
            worldId: 'w1',
            message: 'Hello',
            targetId: 'npc1'
        });

        const saveCalls = (mockChatRepo.save as any).mock.calls;
        assert.equal(saveCalls.length, 1);
        const savedMsg = saveCalls[0].arguments[0];
        assert.equal(savedMsg.type, 'CHAT_PLAYER');
        assert.equal(savedMsg.message, 'Hello');
    });

    it('should throw if targetId is missing', async () => {
        const useCase = new SendPlayerMessageUseCase({} as any, {} as any, { findById: async () => ({}) } as any);
        await assert.rejects(useCase.execute({ worldId: 'w1', message: 'Hi' } as any));
    });
});

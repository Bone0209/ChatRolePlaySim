
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

import { PrismaEntityRepository } from '../../main/infrastructure/repositories';
import { CreateEntityUseCase } from '../../main/application/usecases/entity/CreateEntityUseCase';
import { CreateEntityRequestDto } from '../../main/application/dtos/EntityDto';
import prisma from '../../main/infrastructure/database/prisma';

describe('CreateEntityUseCase Integration', () => {
    let entityRepo: PrismaEntityRepository;
    let useCase: CreateEntityUseCase;
    let worldId: string;

    before(async () => {
        entityRepo = new PrismaEntityRepository();
        useCase = new CreateEntityUseCase(entityRepo);

        // Create a World
        worldId = 'test-world-ent-' + Date.now();
        await (prisma as any).mWorld.create({
            data: {
                id: worldId,
                name: 'Test World for Entity',
                prompt: 'Test Prompt'
            }
        });

        // Seed Definitions
        const definitions = [
            { key: 'appearance', type: 'string', cat: 'persona' },
            { key: 'location', type: 'string', cat: 'state' },
            { key: 'strength', type: 'integer', cat: 'parameter' } // Fallback category checks
        ];

        for (const def of definitions) {
            await (prisma as any).mAttributeDefinition.upsert({
                where: { keyName: def.key },
                update: {},
                create: {
                    keyName: def.key,
                    valueType: def.type,
                    category: def.cat,
                    description: `Test ${def.key}`
                }
            });
        }
    });

    after(async () => {
        await (prisma as any).mWorld.delete({ where: { id: worldId } });
    });

    test('should create an entity with categorized attributes', async () => {
        const request: CreateEntityRequestDto = {
            worldId: worldId,
            type: 'ENTITY_NPC',
            name: 'Test NPC',
            description: 'A test character',
            attributes: {
                'appearance': 'Tall and dark', // Should be persona
                'location': 'Tavern',        // Should be state
                'strength': 10               // Should be parameter (fallback)
            }
        };

        const result = await useCase.execute(request);

        assert.ok(result.id);
        assert.strictEqual(result.name, 'Test NPC');
        assert.strictEqual(result.attributes['appearance'], 'Tall and dark');
        assert.strictEqual(result.attributes['location'], 'Tavern');
        assert.strictEqual(result.attributes['strength'], 10);

        // Verify via Repository
        const entity = await entityRepo.findById(result.id);
        assert.ok(entity);

        // Check internal maps (using public getters if available or getAllParameters with category info)
        const allParams = entity!.getAllParameters();

        // appearance -> persona
        assert.strictEqual(allParams['appearance'].val, 'Tall and dark');
        assert.strictEqual(allParams['appearance'].category, 'persona');

        // location -> state
        assert.strictEqual(allParams['location'].val, 'Tavern');
        assert.strictEqual(allParams['location'].category, 'state');

        // strength -> parameter
        assert.strictEqual(allParams['strength'].val, 10);
        assert.strictEqual(allParams['strength'].category, 'parameter');
    });
});

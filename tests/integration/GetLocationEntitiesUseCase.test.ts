
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

import { PrismaEntityRepository } from '../../main/infrastructure/repositories';
import { GetLocationEntitiesUseCase } from '../../main/application/usecases/entity/GetLocationEntitiesUseCase';
import { GameEntity, EntityType } from '../../main/domain/entities';
import { ParameterValue, Visibility } from '../../main/domain/value-objects';
import prisma from '../../main/infrastructure/database/prisma';

describe('GetLocationEntitiesUseCase Integration', () => {
    let entityRepo: PrismaEntityRepository;
    let useCase: GetLocationEntitiesUseCase;
    let worldId: string;
    let locationAttributes: { key: string, val: string }[];
    let targetLocationId = 'loc-target';
    let otherLocationId = 'loc-other';

    before(async () => {
        entityRepo = new PrismaEntityRepository();
        useCase = new GetLocationEntitiesUseCase(entityRepo);

        // Create a World
        worldId = 'test-world-get-' + Date.now();
        await (prisma as any).mWorld.create({
            data: {
                id: worldId,
                name: 'Test World for Get',
                prompt: 'Test Prompt'
            }
        });

        // Seed Definitions required (locationId)
        await (prisma as any).mAttributeDefinition.upsert({
            where: { keyName: 'locationId' },
            update: {},
            create: { keyName: 'locationId', valueType: 'string', category: 'state' }
        });

        // Helper to create entity
        const createEntity = async (localId: string, locId: string, type: EntityType = 'ENTITY_NPC') => {
            const state = new Map();
            state.set('locationId', ParameterValue.create(locId, Visibility.private()));

            const entity = GameEntity.create({
                id: localId,
                worldId: worldId,
                type: type,
                name: `Entity ${localId}`,
                state: state
            });
            await entityRepo.save(entity);
        };

        // Create entities
        await createEntity('npc1', targetLocationId); // NPC in target
        await createEntity('npc2', targetLocationId); // NPC in target
        await createEntity('npc3', otherLocationId);  // NPC in other
        await createEntity('player1', targetLocationId, 'ENTITY_PLAYER'); // Player in target
    });

    after(async () => {
        await (prisma as any).mWorld.delete({ where: { id: worldId } });
    });

    test('should return only NPCs at the specified location', async () => {
        const result = await useCase.execute({
            worldId: worldId,
            locationId: targetLocationId
        });

        assert.strictEqual(result.length, 2);

        const ids = result.map(e => e.id).sort();
        assert.deepStrictEqual(ids, ['npc1', 'npc2']);

        // Should not include player (useCase calls findNpcsByLocation)
        // Should not include npc3
    });

    test('should return empty list if no NPCs at location', async () => {
        const result = await useCase.execute({
            worldId: worldId,
            locationId: 'loc-empty'
        });
        assert.strictEqual(result.length, 0);
    });
});

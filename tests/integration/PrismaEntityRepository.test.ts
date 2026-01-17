
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { PrismaEntityRepository } from '../../main/infrastructure/repositories/PrismaEntityRepository';
import { GameEntity, ParameterMap } from '../../main/domain/entities';
import { ParameterValue, Visibility } from '../../main/domain/value-objects';
import prisma from '../../main/infrastructure/database/prisma';

// Use a unique ID to avoid collision with seed data
const TEST_ENTITY_ID = 'test-entity-001';
const TEST_WORLD_ID = 'test-world-001';

describe('PrismaEntityRepository Integration', () => {
    const repository = new PrismaEntityRepository();

    before(async () => {
        // Ensure clean state
        if (prisma) {
            await (prisma as any).tEntityAttribute.deleteMany({ where: { entityId: TEST_ENTITY_ID } });
            await (prisma as any).hEntityAttribute.deleteMany({ where: { entityId: TEST_ENTITY_ID } });
            await (prisma as any).mEntity.deleteMany({ where: { id: TEST_ENTITY_ID } });

            // Ensure Attribute Definition exists for 'tone'
            await (prisma as any).mAttributeDefinition.upsert({
                where: { keyName: 'tone' },
                update: {},
                create: {
                    keyName: 'tone',
                    category: 'persona',
                    valueType: 'string',
                    description: 'Test Tone'
                }
            });

            // Create a dummy World if needed by FK (MWorld)
            const w = await (prisma as any).mWorld.findUnique({ where: { id: TEST_WORLD_ID } });
            if (!w) {
                await (prisma as any).mWorld.create({
                    data: {
                        id: TEST_WORLD_ID,
                        name: 'Test World',
                        prompt: 'Test Prompt'
                    }
                });
            }
        }
    });

    after(async () => {
        // Cleanup
        if (prisma) {
            await (prisma as any).mEntity.delete({ where: { id: TEST_ENTITY_ID } }).catch(() => { });
        }
    });

    it('should save a new entity and attributes', async () => {
        const persona = new Map();
        persona.set('tone', ParameterValue.create('Happy', Visibility.public()));

        const entity = GameEntity.create({
            id: TEST_ENTITY_ID,
            worldId: TEST_WORLD_ID,
            type: 'ENTITY_NPC',
            name: 'Test NPC',
            description: 'A test npc',
            persona: persona
        });

        await repository.save(entity);

        // Verify MEntity
        const savedM = await (prisma as any).mEntity.findUnique({ where: { id: TEST_ENTITY_ID } });
        assert.equal(savedM.name, 'Test NPC');

        // Verify TEntityAttribute
        const savedT = await (prisma as any).tEntityAttribute.findUnique({
            where: { entityId_keyName: { entityId: TEST_ENTITY_ID, keyName: 'tone' } }
        });
        assert.ok(savedT);
        assert.equal(savedT.keyValue, 'Happy');

        // Verify HEntityAttribute (Creation)
        const savedH = await (prisma as any).hEntityAttribute.findFirst({
            where: { entityId: TEST_ENTITY_ID, keyName: 'tone' }
        });
        assert.ok(savedH);
        assert.equal(savedH.changeType, 'create');
        assert.equal(savedH.newValue, 'Happy');
    });

    it('should update entity attribute and record history', async () => {
        // Load existing
        let entity = (await repository.findById(TEST_ENTITY_ID))!;
        assert.ok(entity);

        // Update attribute
        const newPersona = entity.persona;
        newPersona.set('tone', ParameterValue.create('Angry', Visibility.public()));

        const updatedEntity = GameEntity.reconstruct({
            id: entity.id,
            worldId: entity.worldId,
            type: entity.type,
            name: entity.name,
            description: entity.description,
            createdAt: entity.createdAt,
            persona: newPersona,
            parameter: entity.parameter,
            state: entity.state
        });

        await repository.save(updatedEntity);

        // Verify T update
        const savedT = await (prisma as any).tEntityAttribute.findUnique({
            where: { entityId_keyName: { entityId: TEST_ENTITY_ID, keyName: 'tone' } }
        });
        assert.equal(savedT.keyValue, 'Angry');

        // Verify H created
        const history = await (prisma as any).hEntityAttribute.findMany({
            where: { entityId: TEST_ENTITY_ID, keyName: 'tone' },
            orderBy: { id: 'desc' }
        });

        // Should have 2 records: 1 create, 1 update
        assert.equal(history.length, 2);
        assert.equal(history[0].changeType, 'update');
        assert.equal(history[0].oldValue, 'Happy');
        assert.equal(history[0].newValue, 'Angry');
    });

    it('should reconstruct entity correctly including attributes', async () => {
        const entity = await repository.findById(TEST_ENTITY_ID);
        assert.ok(entity);

        const tone = entity?.persona.get('tone');
        assert.equal(tone?.value, 'Angry');
        assert.equal(tone?.visibility.isPublic(), true);
    });
});

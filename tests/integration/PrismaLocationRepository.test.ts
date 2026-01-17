
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import { PrismaLocationRepository } from '../../main/infrastructure/repositories/PrismaLocationRepository';
import { Location } from '../../main/domain/entities/Location';
import prisma from '../../main/infrastructure/database/prisma';

const TEST_LOCATION_ID = 'test-location-001';
const TEST_WORLD_ID = 'test-world-loc-001';

describe('PrismaLocationRepository Integration', () => {
    const repository = new PrismaLocationRepository();

    before(async () => {
        if (prisma) {
            // Cleanup
            await (prisma as any).tLocationAttribute.deleteMany({ where: { locationId: TEST_LOCATION_ID } });
            await (prisma as any).hLocationAttribute.deleteMany({ where: { locationId: TEST_LOCATION_ID } });
            // TLocation cascade delete?
            // MLocation cascade delete should handle children
            await (prisma as any).mLocation.deleteMany({ where: { id: TEST_LOCATION_ID } });

            // Create World if needed
            const w = await (prisma as any).mWorld.findUnique({ where: { id: TEST_WORLD_ID } });
            if (!w) {
                await (prisma as any).mWorld.create({
                    data: {
                        id: TEST_WORLD_ID,
                        name: 'Test World for Location',
                        prompt: 'Prompt'
                    }
                });
            }
        }
    });

    after(async () => {
        if (prisma) {
            await (prisma as any).mLocation.delete({ where: { id: TEST_LOCATION_ID } }).catch(() => { });
        }
    });

    it('should save a new location and attributes', async () => {
        const attributes = new Map<string, string>();
        attributes.set('bgm', 'forest.mp3');

        const location = Location.create({
            id: TEST_LOCATION_ID,
            worldId: TEST_WORLD_ID,
            name: 'Forest',
            description: 'A dark forest',
            attributes: attributes
        });

        await repository.save(location);

        // Verify MLocation
        const savedM = await (prisma as any).mLocation.findUnique({ where: { id: TEST_LOCATION_ID } });
        assert.ok(savedM);

        // Verify TLocation
        const savedT = await (prisma as any).tLocation.findUnique({ where: { locationId: TEST_LOCATION_ID } });
        assert.equal(savedT.name, 'Forest');
        assert.equal(savedT.description, 'A dark forest');

        // Verify HLocation (Creation)
        const savedH = await (prisma as any).hLocation.findFirst({ where: { locationId: TEST_LOCATION_ID } });
        assert.equal(savedH.changeType, 'create');

        // Verify TLocationAttribute
        const savedAttrT = await (prisma as any).tLocationAttribute.findUnique({
            where: { locationId_keyName: { locationId: TEST_LOCATION_ID, keyName: 'bgm' } }
        });
        assert.equal(savedAttrT.keyValue, 'forest.mp3');

        // Verify HLocationAttribute
        const savedAttrH = await (prisma as any).hLocationAttribute.findFirst({
            where: { locationId: TEST_LOCATION_ID, keyName: 'bgm' }
        });
        assert.equal(savedAttrH.changeType, 'create');
        assert.equal(savedAttrH.newValue, 'forest.mp3');
    });

    it('should update location and attributes', async () => {
        const location = await repository.findById(TEST_LOCATION_ID);
        assert.ok(location);

        // Update basic info
        const updatedInfo = location!.updateInfo('Dark Forest', 'Very dark');
        // Update attributes
        const updatedComplete = updatedInfo.updateAttribute('bgm', 'dark_forest.mp3');

        await repository.save(updatedComplete);

        // Verify TLocation update
        const savedT = await (prisma as any).tLocation.findUnique({ where: { locationId: TEST_LOCATION_ID } });
        assert.equal(savedT.name, 'Dark Forest');

        // Verify HLocation update
        const historyLoc = await (prisma as any).hLocation.findMany({
            where: { locationId: TEST_LOCATION_ID },
            orderBy: { id: 'desc' }
        });
        assert.equal(historyLoc[0].changeType, 'update');
        assert.equal(historyLoc[0].name, 'Dark Forest');

        // Verify Attribute update
        const savedAttrT = await (prisma as any).tLocationAttribute.findUnique({
            where: { locationId_keyName: { locationId: TEST_LOCATION_ID, keyName: 'bgm' } }
        });
        assert.equal(savedAttrT.keyValue, 'dark_forest.mp3');

        const historyAttr = await (prisma as any).hLocationAttribute.findMany({
            where: { locationId: TEST_LOCATION_ID, keyName: 'bgm' },
            orderBy: { id: 'desc' }
        });
        assert.equal(historyAttr[0].changeType, 'update');
        assert.equal(historyAttr[0].oldValue, 'forest.mp3');
        assert.equal(historyAttr[0].newValue, 'dark_forest.mp3');
    });

    it('should find by id and reconstruct', async () => {
        const location = await repository.findById(TEST_LOCATION_ID);
        assert.ok(location);
        assert.equal(location?.name, 'Dark Forest');
        assert.equal(location?.getAttribute('bgm'), 'dark_forest.mp3');
    });
});

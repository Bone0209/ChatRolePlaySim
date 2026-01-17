
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';

import { PrismaLocationRepository } from '../../main/infrastructure/repositories';
import { CreateLocationUseCase } from '../../main/application/usecases/location/CreateLocationUseCase';
import { CreateLocationRequestDto } from '../../main/application/dtos/LocationDto';
import prisma from '../../main/infrastructure/database/prisma';

describe('CreateLocationUseCase Integration', () => {
    let locationRepo: PrismaLocationRepository;
    let useCase: CreateLocationUseCase;
    let worldId: string;

    before(async () => {
        locationRepo = new PrismaLocationRepository();
        useCase = new CreateLocationUseCase(locationRepo);

        // Create a World for testing
        worldId = 'test-world-loc-' + Date.now();
        await (prisma as any).mWorld.create({
            data: {
                id: worldId,
                name: 'Test World for Location',
                prompt: 'Test Prompt'
            }
        });
    });

    after(async () => {
        // Cleanup
        await (prisma as any).mWorld.delete({
            where: { id: worldId }
        });
    });

    test('should create a location with attributes', async () => {
        const request: CreateLocationRequestDto = {
            worldId: worldId,
            name: 'Forest',
            description: 'A dark forest',
            attributes: {
                'danger': 'High',
                'weather': 'Rainy'
            }
        };

        const result = await useCase.execute(request);

        assert.ok(result.id);
        assert.strictEqual(result.name, 'Forest');
        assert.strictEqual(result.description, 'A dark forest');
        assert.strictEqual(result.worldId, worldId);

        // Verify attributes in response
        assert.strictEqual(result.attributes['danger'], 'High');
        assert.strictEqual(result.attributes['weather'], 'Rainy');

        // Verify in DB
        const loc = await (prisma as any).mLocation.findUnique({
            where: { id: result.id }
        });
        assert.ok(loc);

        const tLoc = await (prisma as any).tLocation.findFirst({
            where: { locationId: result.id }
        });
        assert.strictEqual(tLoc.name, 'Forest');
        assert.strictEqual(tLoc.description, 'A dark forest');

        // Verify attributes in DB
        const attrs = await (prisma as any).tLocationAttribute.findMany({
            where: { locationId: result.id }
        });
        assert.strictEqual(attrs.length, 2);

        const danger = attrs.find((a: any) => a.keyName === 'danger');
        assert.strictEqual(danger.keyValue, 'High');
    });
});


import { PrismaClient } from '@prisma/client';

// Use default client logic
const prisma = new PrismaClient({
    datasourceUrl: 'file:./dev.db'
});

async function main() {
    console.log('--- Verifying Latest Player ---');
    try {
        const player = await prisma.entity.findFirst({
            where: { type: 'ENTITY_PLAYER' },
            orderBy: { createdAt: 'desc' }
        });

        if (!player) {
            console.log('No player found.');
            return;
        }

        console.log(`Player: ${player.name} (World: ${player.worldId})`);
        console.log('Environment:', JSON.stringify(player.environment, null, 2));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const env: any = player.environment;
        if (env.locationId) {
            const loc = await prisma.entity.findUnique({ where: { id: env.locationId } });
            console.log('Linked Location:', loc ? `${loc.name} (${loc.id})` : 'NOT FOUND');
        } else {
            console.log('No locationId in environment.');

            // Helper: Check if ANY valid location exists in this world
            const locs = await prisma.entity.findMany({
                where: { worldId: player.worldId, type: 'ENTITY_LOCATION' }
            });
            console.log(`Debug: Found ${locs.length} locations in this world.`);
            locs.forEach(l => console.log(` - ${l.name} (${l.id})`));
        }

        console.log('--- Checking NPCs in this Location ---');
        if (env.locationId) {
            const npcs = await prisma.entity.findMany({
                where: { type: 'ENTITY_NPC' }
            });
            // Filter manually
            const inLoc = npcs.filter(n => (n.environment as any)?.locationId === env.locationId);
            if (inLoc.length > 0) {
                inLoc.forEach(n => console.log(`- NPC: ${n.name} (${n.id})`));
            } else {
                console.log('No NPCs found via manual checks for this locationId.');
            }
        }
    } catch (e) {
        console.error("DB Error:", e);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });

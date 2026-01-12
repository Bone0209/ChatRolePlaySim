
import prisma from '../main/lib/prisma';

async function main() {
    console.log("Starting DB Schema Verification...");

    if (!prisma) {
        console.error("Prisma client is undefined. Check prisma.ts");
        process.exit(1);
    }

    try {
        // 1. Create World
        const worldId = "verify-world-" + Date.now();
        const world = await prisma.mWorld.create({
            data: {
                id: worldId,
                name: "Verification World",
                prompt: "A test world"
            }
        });
        console.log("Created MWorld:", world.id);

        // 2. Create Entity with split tables
        const entityId = "verify-entity-" + Date.now();
        const entity = await prisma.mEntity.create({
            data: {
                id: entityId,
                worldId: world.id,
                type: 'ENTITY_PLAYER',
                name: "Test Player",
                initialPersona: {
                    create: {
                        data: { "bravery": { "val": 10, "vis": "public" } }
                    }
                },
                currentPersona: {
                    create: {
                        data: { "bravery": { "val": 12, "vis": "public" } }
                    }
                },
                currentParameter: {
                    create: {
                        data: { "hp": { "val": 100, "vis": "private" } }
                    }
                }
            }
        });
        console.log("Created MEntity with relations:", entity.id);

        // 3. Fetch Entity and verify relations
        const fetched = await prisma.mEntity.findUnique({
            where: { id: entityId },
            include: {
                currentPersona: true,
                currentParameter: true,
                currentState: true
            }
        });

        if (!fetched) {
            throw new Error("Failed to fetch entity");
        }

        console.log("Fetched Entity Name:", fetched.name);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const personaData: any = fetched.currentPersona?.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paramData: any = fetched.currentParameter?.data;

        console.log("Current Persona Data:", JSON.stringify(personaData));
        console.log("Current Parameter Data:", JSON.stringify(paramData));

        if (personaData?.bravery?.val === 12 && paramData?.hp?.val === 100) {
            console.log("SUCCESS: Data verification passed.");
        } else {
            console.error("FAILURE: Data mismatch.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    } finally {
        // Cleanup? Maybe leave it for inspection
        // await prisma.$disconnect();
    }
}

main();

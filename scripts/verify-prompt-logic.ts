
import prisma from '../main/lib/prisma';

async function main() {
    console.log("Starting Prompt Logic Verification...");

    if (!prisma) {
        console.error("Prisma client is undefined.");
        process.exit(1);
    }

    try {
        // 1. Setup Data: World & NPC
        const worldId = "prompt-verify-world-" + Date.now();
        await prisma.mWorld.create({
            data: { id: worldId, name: "Prompt World", prompt: "Test" }
        });

        const entityId = "prompt-verify-npc-" + Date.now();
        await prisma.mEntity.create({
            data: {
                id: entityId,
                worldId: worldId,
                type: 'ENTITY_NPC',
                name: "Test NPC",
                currentPersona: {
                    create: {
                        data: {
                            "personality": { "val": "Tsundere", "vis": "vis_private" },
                            "firstPerson": { "val": "Watashi", "vis": "vis_public" },
                            "ending": { "val": "Desuwa", "vis": "vis_public" }
                        }
                    }
                },
                currentState: {
                    create: {
                        data: {
                            "affection": { "val": 50, "vis": "vis_private" },
                            "mood": { "val": "Happy", "vis": "vis_public" }
                        }
                    }
                },
                currentParameter: { create: { data: {} } }
            }
        });

        console.log("Created NPC:", entityId);

        // 2. Simulate Context Gathering (Logic from background.ts)
        const npcEntity = await prisma.mEntity.findUnique({
            where: { id: entityId },
            include: { currentState: true, currentPersona: true, currentParameter: true }
        });

        if (!npcEntity) throw new Error("NPC not found");

        // Merge Env
        const nEnv: any = {
            ...(npcEntity.currentState?.data as object || {}),
            ...(npcEntity.currentPersona?.data as object || {}),
            ...(npcEntity.currentParameter?.data as object || {})
        };

        const getVal = (key: string) => {
            if (nEnv[key]?.val !== undefined) return nEnv[key].val;
            if (nEnv[key]?.value !== undefined) return nEnv[key].value;
            if (nEnv[key] !== undefined && typeof nEnv[key] !== 'object') return nEnv[key];
            return null;
        };

        const personality = getVal('personality');
        const firstPerson = getVal('firstPerson');
        const affection = getVal('affection');

        console.log(`Fetched Values -> Personality: ${personality}, FirstPerson: ${firstPerson}, Affection: ${affection}`);

        if (personality === "Tsundere" && firstPerson === "Watashi" && affection === 50) {
            console.log("SUCCESS: Context logic correctly extracts 'val'.");
        } else {
            console.error("FAILURE: Context logic failed to extract values.");
            console.log("nEnv dump:", JSON.stringify(nEnv, null, 2));
            process.exit(1);
        }

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main();

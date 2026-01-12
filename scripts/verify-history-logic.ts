
import prisma from '../main/lib/prisma';
import { updateEntityVariable } from '../main/lib/entityUtils';

async function main() {
    console.log("Starting History Logic Verification...");

    if (!prisma) {
        console.error("Prisma client is undefined.");
        process.exit(1);
    }

    try {
        // 1. Setup: World & Entity with Initial State
        const worldId = "hist-verify-world-" + Date.now();
        await prisma.mWorld.create({
            data: { id: worldId, name: "History World", prompt: "Test" }
        });

        const entityId = "hist-verify-npc-" + Date.now();
        await prisma.mEntity.create({
            data: {
                id: entityId,
                worldId: worldId,
                type: 'ENTITY_NPC',
                name: "History NPC",
                currentState: {
                    create: {
                        data: {
                            "affection": { "val": 0, "vis": "vis_private" }
                        }
                    }
                },
                currentParameter: {
                    create: {
                        data: {
                            "hp": { "val": 100, "vis": "vis_public" }
                        }
                    }
                }
            }
        });

        console.log("Created Entity:", entityId);

        // 2. Perform Update via entityUtils (State: Affection)
        await updateEntityVariable(entityId, 'state', 'affection', 10, 'vis_private');
        console.log("Updated Affection to 10.");

        // 2b. Perform Update via entityUtils (Parameter: Strength) - Testing generic capability
        // First we need to populate TParameter (Creation logic in this script was incomplete for verifying this, let's fix creation first)
        // Actually, let's just create the optional relation on the fly or ensure creation has it.
        // The script above only created 'currentState'. Let's update the creation block.

        // 3. Verify T_ Table
        const tState = await prisma.tEntityState.findUnique({ where: { entityId } });
        const val = (tState?.data as any)?.affection?.val;
        if (val !== 10) throw new Error(`T_ Table value incorrect. Expected 10, got ${val}`);
        console.log("T_ Table Verified.");

        // 4. Verify H_ Table
        const hLogs = await prisma.hEntityState.findMany({ where: { entityId } });
        console.log(`Found ${hLogs.length} history logs.`);

        if (hLogs.length === 0) throw new Error("No history logs found.");

        const diff = hLogs[0].diff as any;
        if (diff.upd?.affection?.val === 10) {
            console.log("SUCCESS: History log contains correct diff.");
        } else if (diff.add?.affection?.val === 10) {
            console.log("SUCCESS: History log contains correct diff (as ADD).");
        } else {
            console.log("Diff Content:", JSON.stringify(diff, null, 2));
            throw new Error("History log diff incorrect.");
        }

        // 5. Test Parameter Update (Generic Logic Verification)
        await updateEntityVariable(entityId, 'parameter', 'hp', 90, 'vis_public');
        console.log("Updated HP to 90.");

        const tParam = await prisma.tEntityParameter.findUnique({ where: { entityId } });
        const hpVal = (tParam?.data as any)?.hp?.val;
        if (hpVal !== 90) throw new Error(`T_Parameter value incorrect. Expected 90, got ${hpVal}`);
        console.log("T_Parameter Table Verified.");

        const hParamLogs = await prisma.hEntityParameter.findMany({ where: { entityId } });
        if (hParamLogs.length > 0) {
            const diffP = hParamLogs[0].diff as any;
            if (diffP.upd?.hp?.val === 90 || diffP.add?.hp?.val === 90) {
                console.log("SUCCESS: History log (HP) contains correct diff.");
            } else {
                console.log("Params Diff:", JSON.stringify(diffP, null, 2));
                throw new Error("History log (HP) incorrect.");
            }
        } else {
            throw new Error("No history logs for Parameter found.");
        }

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main();

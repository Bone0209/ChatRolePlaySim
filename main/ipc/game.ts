
import { ipcMain } from 'electron';
import prisma from '../lib/prisma';

// Constants
const STEPS_PER_DAY = 100000; // 1日あたりのUnit数 (変更前: 30)

// Types
interface StepState {
    totalSteps: number;
    day: number;
    timeOfDay: string; // 'Morning', 'Afternoon', 'Evening', 'Night'
    currentStep: number; // 0 to 29
    locationName?: string;
    locationId?: string;
    npcs?: Array<{ id: string, name: string, role: string }>;
}

export const registerGameHandlers = () => {
    console.log("[IPC] Registering game handlers...");

    // Helper to calculate state from total steps
    const calculateState = async (totalSteps: number, worldId?: string): Promise<StepState> => {
        const day = Math.floor(totalSteps / STEPS_PER_DAY) + 1;
        const currentStep = totalSteps % STEPS_PER_DAY;

        // Map 100,000 units to time of day
        let timeOfDay = 'Night';
        // 0 - 100,000 units mapped to 24h cycle roughly
        // 0-20k: Night/Early Morning
        // 20k-50k: Morning/Day
        // 50k-75k: Afternoon/Evening
        // 75k-100k: Night

        if (currentStep < 20000) timeOfDay = 'Early Morning';
        else if (currentStep < 50000) timeOfDay = 'Morning';
        else if (currentStep < 75000) timeOfDay = 'Afternoon';
        else timeOfDay = 'Evening';

        if (!prisma) {
            return { totalSteps, day, timeOfDay, currentStep };
        }

        // --- Fetch Location & NPCs ---
        let locationName = "Unknown";
        let locationId = "";
        let npcs: any[] = [];

        try {
            // 1. Get Player Entity to find locationId
            // TODO: In a real multi-world app, we need worldId passed here. 
            // For now, valid assumption is single active world or first found player.
            // Or we assume the frontend passes worldId? 
            // Since this handler is generic, let's fetch the most recent updated player?
            // "Entity" table.

            // Simplification: Fetch the first ENTITY_PLAYER found.
            // Debug: Log what we are fetching
            console.log(`[GameIPC] state request for worldId: ${worldId}`);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const whereClause: any = { type: 'ENTITY_PLAYER' };
            if (worldId) whereClause.worldId = worldId;

            const player = await prisma.mEntity.findFirst({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    currentState: true,
                    currentPersona: true,
                    currentParameter: true
                }
            });

            console.log(`[GameIPC] Found Player: ${player?.name} (ID: ${player?.id})`);

            if (player) {
                // Reconstruct environment
                const env: any = {
                    ...(player.currentState?.data as object || {}),
                    ...(player.currentPersona?.data as object || {}),
                    ...(player.currentParameter?.data as object || {})
                };
                const locVal = env.location?.val !== undefined ? env.location.val : env.location;
                const locIdVal = env.locationId?.val !== undefined ? env.locationId.val : env.locationId;

                console.log(`[GameIPC] Player Env: location=${locVal}, locationId=${locIdVal}`);

                locationName = locVal || "Unknown";
                locationId = locIdVal || "";

                if (locationId) {
                    // 2. Fetch NPCs in this location
                    const foundNpcs = await prisma.mEntity.findMany({
                        where: {
                            type: 'ENTITY_NPC',
                        },
                        include: {
                            currentState: true,
                            currentPersona: true,
                            currentParameter: true
                        }
                    });

                    // Filter in memory
                    npcs = foundNpcs.filter(n => {
                        const nEnv: any = {
                            ...(n.currentState?.data as object || {}),
                            ...(n.currentPersona?.data as object || {}),
                            ...(n.currentParameter?.data as object || {})
                        };

                        // Handle both old flat structure and new nested structure
                        // New: locationId: { val: '...', ... }
                        // Old: locationId: '...'
                        const nLocId = nEnv.locationId?.val !== undefined ? nEnv.locationId.val : nEnv.locationId;

                        return nLocId === locationId;
                    }).map(n => {
                        const nEnv: any = {
                            ...(n.currentState?.data as object || {}),
                            ...(n.currentPersona?.data as object || {}),
                            ...(n.currentParameter?.data as object || {})
                        };
                        // Role extraction
                        const role = nEnv.role?.val !== undefined ? nEnv.role.val : (nEnv.role || 'NPC');

                        return {
                            id: n.id,
                            name: n.name,
                            role: role
                        };
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch extended game state:", e);
        }

        return { totalSteps, day, timeOfDay, currentStep, locationName, locationId, npcs };
    };

    // Handler: Get Entity Details
    ipcMain.handle('game:get-entity', async (event, entityId: string) => {
        if (!prisma) throw new Error('Database not initialized');
        if (!entityId) return null;
        try {
            const entity = await prisma.mEntity.findUnique({
                where: { id: entityId },
                include: {
                    currentState: true,
                    currentPersona: true,
                    currentParameter: true
                }
            });
            if (entity) {
                return {
                    ...entity,
                    environment: {
                        ...(entity.currentState?.data as object || {}),
                        ...(entity.currentPersona?.data as object || {}),
                        ...(entity.currentParameter?.data as object || {})
                    }
                };
            }
            return entity;
        } catch (e) {
            console.error("Failed to fitches entity:", e);
            throw e;
        }
    });

    // Handler: Get Current Game State
    ipcMain.handle('game:get-state', async (event, worldId) => {
        if (!prisma) throw new Error('Database not initialized');
        if (!worldId) return calculateState(0, worldId); // No world, no state

        // Fetch total_steps from GlobalConstant (Scoped by World)
        const keyName = `steps_${worldId}`;
        let constant = await prisma.mGlobalConstant.findUnique({
            where: { keyName: keyName }
        });

        // Initialize if not exists
        if (!constant) {
            constant = await prisma.mGlobalConstant.create({
                data: {
                    category: 'system',
                    keyName: keyName,
                    keyValue: '0'
                }
            });
        }

        const totalSteps = parseInt(constant.keyValue, 10);
        return await calculateState(totalSteps, worldId);
    });

    // Handler: Process Action (Advance Time)
    ipcMain.handle('game:process-action', async (event, { mode, content, worldId }: { mode: string, content: string, worldId?: string }) => {
        if (!prisma) throw new Error('Database not initialized');
        if (!worldId) throw new Error('World ID is required for actions');

        // Logic to calculate step cost
        let cost = 0;
        if (mode === 'TALK') cost = 1;
        else if (mode === 'ACTION') cost = 3;
        else if (mode === 'SKIP') cost = STEPS_PER_DAY;

        // Fetch current
        const keyName = `steps_${worldId}`;
        let constant = await prisma.mGlobalConstant.findUnique({
            where: { keyName: keyName }
        });

        if (!constant) {
            constant = await prisma.mGlobalConstant.create({
                data: { category: 'system', keyName: keyName, keyValue: '0' }
            });
        }

        let currentTotal = parseInt(constant.keyValue, 10);
        let newTotal = currentTotal + cost;

        if (mode === 'SKIP') {
            const currentDay = Math.floor(currentTotal / STEPS_PER_DAY);
            const nextDayStart = (currentDay + 1) * STEPS_PER_DAY;
            newTotal = nextDayStart;
        }

        // Update DB
        await prisma.mGlobalConstant.update({
            where: { keyName: keyName },
            data: { keyValue: newTotal.toString() }
        });

        return await calculateState(newTotal, worldId);
    });

    // Handler: Get Chat History
    ipcMain.handle('game:get-chat-history', async (event, worldId: string) => {
        if (!prisma) return [];

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chats = await (prisma as any).tChat.findMany({
                where: { worldId },
                orderBy: { id: 'asc' },
                take: 50,
                include: { entity: true }
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return chats.map((c: any) => {
                let role = 'system';
                let speakerName = 'System';

                if (c.chatType === '1') { // CHAT_PLAYER
                    role = 'user';
                    speakerName = 'Player';
                } else if (c.chatType === '2') { // CHAT_NPC
                    role = 'assistant';
                    speakerName = c.entity?.name || 'Unknown';
                }

                return {
                    role,
                    content: c.message,
                    speakerName,
                    entityId: c.entityId
                };
            });
        } catch (e) {
            console.error("Failed to fetch chat history:", e);
            return [];
        }
    });
};

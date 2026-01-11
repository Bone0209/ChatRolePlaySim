
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

            const player = await prisma.entity.findFirst({
                where: whereClause,
                orderBy: { createdAt: 'desc' } // Get the latest active player for this world
            });

            console.log(`[GameIPC] Found Player: ${player?.name} (ID: ${player?.id})`);

            if (player && player.environment) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const env: any = player.environment;
                console.log(`[GameIPC] Player Env: location=${env.location}, locationId=${env.locationId}`);

                locationName = env.location || "Unknown";
                locationId = env.locationId || "";

                if (locationId) {
                    // 2. Fetch NPCs in this location
                    const foundNpcs = await prisma.entity.findMany({
                        where: {
                            type: 'ENTITY_NPC',
                            // Prisma JSON filtering or fetching all and filtering in JS if JSON filter unstable
                        }
                    });

                    // Filter in memory for safety with SQLite JSON
                    npcs = foundNpcs.filter(n => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const nEnv: any = n.environment || {};

                        // Handle both old flat structure and new nested structure
                        // New: locationId: { value: '...', ... }
                        // Old: locationId: '...'
                        const nLocId = nEnv.locationId?.value !== undefined ? nEnv.locationId.value : nEnv.locationId;

                        return nLocId === locationId;
                    }).map(n => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const nEnv: any = n.environment || {};
                        // Role extraction
                        const role = nEnv.role?.value !== undefined ? nEnv.role.value : (nEnv.role || 'NPC');

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
            const entity = await prisma.entity.findUnique({
                where: { id: entityId }
            });
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
        let constant = await prisma.globalConstant.findUnique({
            where: { keyName: keyName }
        });

        // Initialize if not exists
        if (!constant) {
            constant = await prisma.globalConstant.create({
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
        let constant = await prisma.globalConstant.findUnique({
            where: { keyName: keyName }
        });

        if (!constant) {
            constant = await prisma.globalConstant.create({
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
        await prisma.globalConstant.update({
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
            const chats = await (prisma as any).chat.findMany({
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

import { ipcMain } from 'electron';
import prisma from '../lib/prisma';
import { generateId } from '../lib/uuid';
import { getAppConfig } from '../lib/config';
import { PromptTemplate } from '../lib/PromptTemplate';
import { logLlmRequest, logLlmResponse } from '../lib/logger';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// --- Helper Functions ---

/**
 * Get the absolute path to the prompts directory based on the environment.
 */
const getPromptsPath = (): string => {
    // In production (packaged), resources are usually in specific locations
    // In dev, we check the source tree.

    // Check known locations in order of priority
    const candidates = [
        path.join(__dirname, '..', 'prompts'), // Built/Prod structure often ends up here
        path.join(process.cwd(), 'main', 'prompts'),
        path.join(process.cwd(), 'frontend', 'main', 'prompts'),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    console.warn("[IPC] Prompts directory not found in candidates:", candidates);
    return ""; // Or throw error?
};

/**
 * Helper to generate random flavor text for world generation
 */
const getRandomFlavor = () => {
    const flavors = [
        "剣と魔法が支配する王道のハイファンタジー",
        "蒸気機関と魔導技術が発展したスチームパンク",
        "神々の大戦により砕け散った浮遊大陸群",
        "永きにわたる平和が続く牧歌的な世界",
        "精霊と契約し、自然と共に生きる世界",
        "地下深くに広がる巨大なダンジョン国家",
        "星々を旅する魔法船が行き交う大航海時代",
        "お伽話のような不思議でコミカルな世界",
        "四季が失われ、冬だけが続く極寒の世界",
        "古代の遺跡が眠る神秘的な世界",
        "植物が文明を侵食したポストアポカリプス",
        "水晶のエネルギーで繁栄する文明",
        "ドラゴンと人間が共存する世界",
        "海に沈んだ古代都市の伝説がある世界"
    ];
    return flavors[Math.floor(Math.random() * flavors.length)];
};

// --- IPC Handlers ---

export const registerWorldHandlers = () => {
    console.log("[IPC] Registering world handlers...");

    // List all worlds
    ipcMain.handle('world:list', async () => {
        if (!prisma) {
            console.error('[IPC] Prisma is not initialized.');
            throw new Error('Database connection failed. Check server logs.');
        }
        try {
            const worlds = await prisma.world.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return worlds;
        } catch (error) {
            console.error('Failed to list worlds:', error);
            throw error;
        }
    });

    // Create a new world
    ipcMain.handle('world:create', async (event, { name, prompt, npcList }: { name: string, prompt: string, npcList?: any[] }) => {
        if (!prisma) {
            throw new Error('Database connection failed.');
        }
        try {
            const id = generateId();

            const entitiesToCreate: any[] = [
                {
                    type: 'ENTITY_WORLD',
                    name: 'World State',
                    description: 'Global world state',
                    environment: {
                        turn: 0,
                        weather: 'Sunny',
                        turns_per_day: 30,
                        year: 1000,
                        month: 1,
                        day: 1
                    }
                },
                // Player entity will be added later or updated
                {
                    type: 'ENTITY_PLAYER',
                    name: 'Player',
                    description: 'Player character',
                    environment: {
                        condition: 'Normal',
                        location: 'Unknown',
                        locationId: null, // Unified structure
                        parameter: {
                            attributes: {
                                VIT: { base: 10, effective: 10 },
                                DEX: { base: 10, effective: 10 },
                                LUCK: { base: 10, effective: 10 }
                            },
                            resources: {
                                hp: { current: 100, max: 100 },
                                mp: { current: 50, max: 50 }
                            }
                        }
                    }
                }
            ];

            // Process NPC List or Auto-Generate
            let finalNpcList = npcList;

            if (!finalNpcList || finalNpcList.length === 0) {
                console.log('[IPC] No NPC list provided. Starting auto-generation...');
                // Auto-generation Logic
                try {
                    const config = getAppConfig();
                    // Use MAIN_MODEL (High Intel) for World Generation
                    const providerConfig = config.mainModel;
                    console.log(`[IPC] Provider selected for Auto-Gen: MAIN_MODEL (${providerConfig.model})`);

                    const promptsPath = getPromptsPath();
                    if (promptsPath) {
                        const templatePath = path.join(promptsPath, 'world_gen_npc.md');
                        const systemTemplatePath = path.join(promptsPath, 'world_gen_system.md');

                        if (fs.existsSync(templatePath)) {
                            const template = new PromptTemplate(templatePath);

                            let systemPrompt = "あなたはファンタジーRPGの世界設定を作成するクリエイティブなアシスタントです。";
                            if (fs.existsSync(systemTemplatePath)) {
                                systemPrompt = fs.readFileSync(systemTemplatePath, 'utf-8');
                            }

                            const userPrompt = template.render({
                                context: `World: ${name}\nDescription: ${prompt}`,
                                flavor: getRandomFlavor()
                            });

                            // Request JSON Object
                            const payload = {
                                messages: [
                                    { role: 'system', content: systemPrompt },
                                    { role: 'user', content: userPrompt }
                                ],
                                model: providerConfig.model,
                                temperature: 0.9,
                                response_format: { type: "json_object" }, // Enforce JSON
                                seed: Math.floor(Math.random() * 1000000)
                            };

                            console.log(`[IPC] Sending JSON request to ${providerConfig.baseUrl}...`);
                            logLlmRequest(providerConfig.baseUrl, providerConfig.model, userPrompt);

                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 sec timeout (5 min)

                            try {
                                const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        ...(providerConfig.apiKey ? { 'Authorization': `Bearer ${providerConfig.apiKey}` } : {})
                                    },
                                    body: JSON.stringify(payload),
                                    signal: controller.signal
                                });
                                clearTimeout(timeoutId);

                                if (response.ok) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const data: any = await response.json();
                                    let content = data.choices?.[0]?.message?.content || "{}";
                                    logLlmResponse(content);
                                    console.log("[IPC] AI Response received.");

                                    // Cleanup Thinking models (assistantfinal / <thought>) strategies
                                    if (content.includes('assistantfinal')) {
                                        content = content.split('assistantfinal').pop() || content;
                                    }

                                    content = content.trim();

                                    // Remove markdown code blocks if present
                                    if (content.startsWith('```')) {
                                        content = content.replace(/^```json\s?/, '').replace(/```$/, '');
                                    }

                                    try {
                                        const parsed = JSON.parse(content);
                                        if (parsed.npc && parsed.location) {
                                            finalNpcList = [parsed];
                                            console.log("[IPC] Auto-generation success.");
                                        }
                                    } catch (e) {
                                        console.error("Auto-generation parse error:", e);
                                        console.log("Raw content:", content);
                                    }
                                } else {
                                    console.error(`[IPC] API Error: ${response.status} ${response.statusText}`);
                                }
                            } catch (fetchErr) {
                                clearTimeout(timeoutId);
                                console.error("Auto-generation fetch failed:", fetchErr);
                            }
                        } else {
                            console.error(`[IPC] Template not found: ${templatePath}`);
                        }
                    } else {
                        console.error("[IPC] Prompts directory not found.");
                    }
                } catch (err) {
                    console.error("Auto-generation fatal error:", err);
                }
            }

            if (finalNpcList && Array.isArray(finalNpcList)) {
                for (const npcData of finalNpcList) {
                    // npcData should be { npc: {...}, location: {...} }
                    if (npcData.npc && npcData.location) {
                        const locationId = generateId();

                        // 1. Create Location Entity
                        entitiesToCreate.push({
                            id: locationId,
                            type: 'ENTITY_LOCATION',
                            name: npcData.location.name || 'Unknown Location',
                            description: npcData.location.description,
                            environment: {
                                ...npcData.location,
                                type: npcData.location.type || 'Generic'
                            }
                        });

                        // 2. Create NPC Entity
                        // npcData is now { npc: { environment: { ... } }, location: { ... } }
                        const npcEnvironment = npcData.npc.environment || {};

                        // Ensure name is extracted correctly for top-level name field
                        const npcName = npcEnvironment.name?.value || 'Unknown NPC';
                        const npcDesc = npcEnvironment.role?.value || npcEnvironment.title?.value || 'NPC';

                        // Inject location into NPC state
                        npcEnvironment.locationName = { value: npcData.location.name, category: 'state', visible: true };
                        npcEnvironment.locationId = { value: locationId, category: 'state', visible: true };

                        entitiesToCreate.push({
                            type: 'ENTITY_NPC',
                            name: npcName,
                            description: npcDesc,
                            environment: npcEnvironment
                        });

                        // 3. Update Player Location to match the first generated location
                        const playerEntity = entitiesToCreate.find(e => e.type === 'ENTITY_PLAYER');
                        if (playerEntity) {
                            // Player uses different structure for now, or could be unified later.
                            // Keeping minimal update for player to avoid breaking valid structure if it differs.
                            playerEntity.environment.location = npcData.location.name;
                            playerEntity.environment.locationId = locationId;
                            console.log(`[IPC] Player spawned at ${npcData.location.name} (${locationId})`);
                        }
                    }
                }
            }

            const world = await prisma.world.create({
                data: {
                    id,
                    name,
                    prompt: prompt || '',
                    createdAt: new Date(),
                    entities: {
                        create: entitiesToCreate
                    }
                }
            });
            return world;
        } catch (error) {
            console.error('Failed to create world:', error);
            throw error;
        }
    });

    // Generate World Metadata via AI
    ipcMain.handle('world:generate', async (event, { type, context }: { type: 'title' | 'description' | 'npc', context: string }) => {
        console.log(`[IPC] world:generate called for ${type}`);
        const config = getAppConfig();

        // Determine Provider:
        // Title -> SUB_MODEL (Local/Fast)
        // Description, NPC -> MAIN_MODEL (High Intel)

        let providerConfig = config.mainModel; // Default to Main

        if (type === 'title') {
            providerConfig = config.subModel;
        }

        console.log(`[IPC] Using provider: ${type === 'title' ? 'SUB_MODEL' : 'MAIN_MODEL'} (${providerConfig.model}) for ${type}`);

        const promptsPath = getPromptsPath();
        if (!promptsPath) {
            console.error("[IPC] Prompts directory not found.");
            return "Error: Prompts directory not found";
        }

        // Load Template
        let templateName = 'world_gen_desc.md';
        if (type === 'title') templateName = 'world_gen_title.md';
        if (type === 'npc') templateName = 'world_gen_npc.md';

        const templatePath = path.join(promptsPath, templateName);

        if (!fs.existsSync(templatePath)) {
            console.error(`[IPC] Prompt template ${templateName} not found at ${templatePath}.`);
            return "Error: Template not found";
        }

        const template = new PromptTemplate(templatePath);
        const flavor = getRandomFlavor();

        // Load System Prompt Template
        const systemTemplatePath = path.join(promptsPath, 'world_gen_system.md');
        let systemPrompt = "あなたはファンタジーRPGの世界設定を作成するクリエイティブなアシスタントです。";
        if (fs.existsSync(systemTemplatePath)) {
            systemPrompt = fs.readFileSync(systemTemplatePath, 'utf-8');
        }

        let userPrompt = template.render({
            context: context || "指定なし",
            flavor: flavor
        });

        console.log(`[IPC] Generaton Prompt (Preview): ${userPrompt.substring(0, 50)}...`);

        // Enable JSON mode for description as well to avoid thinking traces
        const isJsonMode = type === 'npc' || type === 'description';

        const payload = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: providerConfig.model,
            temperature: 0.9,
            ...(isJsonMode ? { response_format: { type: "json_object" } } : {}),
            seed: Math.floor(Math.random() * 1000000)
        };

        try {
            // Helper for timeout
            const fetchWithTimeout = async (url: string, options: any, timeout = 15000) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                try {
                    const response = await fetch(url, { ...options, signal: controller.signal });
                    clearTimeout(id);
                    return response;
                } catch (err) {
                    clearTimeout(id);
                    throw err;
                }
            };

            console.log(`[IPC] Calling Generation API (${providerConfig.baseUrl})...`);
            logLlmRequest(providerConfig.baseUrl, providerConfig.model, JSON.stringify(payload, null, 2));
            const response = await fetchWithTimeout(`${providerConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(providerConfig.apiKey ? { 'Authorization': `Bearer ${providerConfig.apiKey}` } : {})
                },
                body: JSON.stringify(payload)
            }, 60000);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = await response.json();
            let content = data.choices?.[0]?.message?.content || "";
            logLlmResponse(content);

            // Cleanup Thinking models (assistantfinal / <thought>) strategies
            // Some keys: assistantfinal
            if (content.includes('assistantfinal')) {
                content = content.split('assistantfinal').pop() || content;
            }

            content = content.trim();

            // Attempt JSON parsing if expected
            if (isJsonMode) {
                // Remove markdown wrappers
                if (content.startsWith('```')) {
                    content = content.replace(/^```json\s?/, '').replace(/```$/, '');
                }
                try {
                    const parsed = JSON.parse(content);
                    // Extract text from JSON field 'description' or 'text' or 'content'
                    if (parsed.description) return parsed.description;
                    if (parsed.text) return parsed.text;
                    if (parsed.content) return parsed.content;
                    // fallback
                    return content;
                } catch (e) {
                    console.warn("Failed to parse JSON response, returning raw cleaned text.", e);
                }
            }

            return content;

        } catch (err: any) {
            console.error("Generation failed:", err);
            return `Error: ${err.message}`;
        }
    });

};

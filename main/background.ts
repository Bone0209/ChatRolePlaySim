import { app, BrowserWindow, ipcMain, screen } from 'electron';
import serve from 'electron-serve';
import path from 'path';
import fs from 'fs';
import { PromptTemplate } from './lib/PromptTemplate';
import prisma from './lib/prisma';
import { registerWorldHandlers } from './ipc/worlds';
import { registerGameHandlers } from './ipc/game';

const loadURL = serve({ directory: 'renderer/out' });

// Window references
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

// Window Dimensions
const DEFAULT_DIMENSIONS = { width: 1280, height: 800 };

// -- Config Loading --
import { getAppConfig } from './lib/config';

let config = getAppConfig(); // Initial load for startup logging
console.log('Loaded config:', config);

// -- Logging Helper --
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logPath = path.join(logDir, 'app.log');

const logToFile = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    const logLine = `[${timestamp}] ${message} ${formattedArgs}\n`;

    // Write to file
    fs.appendFileSync(logPath, logLine);

    // Also output to console (even if garbled)
    console.log(message, ...args);
};

// Log startup
logToFile("App Started. Log path:", logPath);

// -- Main Window --
async function createMainWindow() {
    if (mainWindow) return;

    mainWindow = new BrowserWindow({
        width: DEFAULT_DIMENSIONS.width,
        height: DEFAULT_DIMENSIONS.height,
        resizable: true,
        autoHideMenuBar: true,
        title: 'ChatRPG',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Start at the index page, which handles routing
    const startUrl = 'http://localhost:8888';

    if (isDev) {
        await mainWindow.loadURL(startUrl);
        mainWindow.webContents.openDevTools();
    } else {
        await loadURL(mainWindow);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// -- App Lifecycle --

app.on('ready', () => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        process.exit(0);
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

// Ping handler for diagnostics
ipcMain.handle('ping', () => 'pong');

// Register World handlers imported at top level
console.log("[Main] Calling registerWorldHandlers...");
registerWorldHandlers();
registerGameHandlers();

// Navigation events now just log, as routing is client-side. 
// If specific backend actions are needed on nav, add them here.
ipcMain.on('launch-chat', (event, worldId) => {
    console.log('Navigating to chat for world:', worldId);
    // Determine if we need to send an event back to renderer to redirect, 
    // but usually renderer handles this. 
    // If this IPC is called, it might be for window mgmt which we removed.
});

ipcMain.on('open-inventory', () => {
    // console.log('Open inventory requested');
    // TODO: Send event to renderer to open inventory panel if needed
});

ipcMain.on('open-status', () => {
    // console.log('Open status requested');
    // TODO: Send event to renderer to open status panel if needed
});

// Chat API handler
ipcMain.handle('chat', async (event, { message, history = [], targetId, worldId }: { message: string, history: Array<{ role: string, content: string }>, targetId?: string, worldId?: string }) => {
    console.log(`[IPC:chat] Message: "${message}", WorldID: ${worldId}, TargetID: ${targetId}`);

    if (!prisma) {
        console.error('[IPC:chat] Prisma NOT initialized');
        return "System Error: Database not available.";
    }

    // 0. PRE-PERSISTENCE: Save User Message
    if (worldId) {
        try {
            // Need Player Entity ID
            // We can fetch it or just assume there's one player per world for now
            const player = await prisma.entity.findFirst({
                where: { worldId, type: 'ENTITY_PLAYER' }
            });

            await prisma.chat.create({
                data: {
                    worldId: worldId,
                    chatType: '1', // CHAT_PLAYER
                    message: message,
                    entityId: player?.id || null
                }
            });
        } catch (e) {
            console.error("Failed to save user chat log:", e);
        }
    }

    // 1. Gather Context (Location, Time, Target NPC)
    let contextData = {
        day: 1,
        timeOfDay: 'Day',
        locationName: 'Unknown',
        locationDesc: '',
        targetName: 'Gamemaster',
        targetProfile: '',
        weather: 'Clear'
    };

    try {
        // Time
        const stepsConst = await prisma.globalConstant.findUnique({ where: { keyName: 'total_steps' } });
        if (stepsConst) {
            const totalSteps = parseInt(stepsConst.keyValue, 10);
            contextData.day = Math.floor(totalSteps / 30) + 1;
            const currentStep = totalSteps % 30;
            if (currentStep < 5) contextData.timeOfDay = 'Early Morning';
            else if (currentStep < 12) contextData.timeOfDay = 'Morning';
            else if (currentStep < 18) contextData.timeOfDay = 'Afternoon';
            else if (currentStep < 24) contextData.timeOfDay = 'Evening';
            else contextData.timeOfDay = 'Night';
        }

        // Location & Player (Scoped to worldId if possible, but currently generic 'findFirst')
        // TODO: Update findFirst to use worldId when robust multi-world is fully strictly enforced
        const whereClause: any = { type: 'ENTITY_PLAYER' };
        if (worldId) whereClause.worldId = worldId;

        const player = await prisma.entity.findFirst({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        if (player && player.environment) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pEnv: any = player.environment;
            contextData.locationName = pEnv.location || 'Unknown';

            if (pEnv.locationId) {
                const locEntity = await prisma.entity.findUnique({ where: { id: pEnv.locationId } });
                if (locEntity) {
                    contextData.locationDesc = locEntity.description || '';
                }
            }
        }

        // Target NPC
        if (targetId) {
            const npcEntity = await prisma.entity.findUnique({ where: { id: targetId } });
            if (npcEntity) {
                contextData.targetName = npcEntity.name;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const nEnv: any = npcEntity.environment;
                // Build profile string from environment
                const profile = nEnv.profile || {};
                const firstPerson = profile.first_person || '私';
                contextData.targetProfile = `
Name: ${npcEntity.name}
Role: ${nEnv.role || 'NPC'}
Personality: ${profile.personality || 'Standard'}
First Person: ${firstPerson}
Tone: ${profile.speaking_style || 'Normal'}
                `.trim();
            }
        }

    } catch (e) {
        console.warn('Failed to fetch context:', e);
    }

    // 2. Prepare Judgement Prompt
    let templatePath = '';
    const possibleTemplatePaths = [
        path.join(__dirname, 'prompts', 'user_prompt.md'),
        path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md'),
        path.join(process.cwd(), 'frontend', 'main', 'prompts', 'user_prompt.md'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        path.join((app as any).getAppPath(), 'main', 'prompts', 'user_prompt.md'),
    ];

    for (const p of possibleTemplatePaths) {
        if (fs.existsSync(p)) {
            templatePath = p;
            break;
        }
    }

    let judgementJson: any = { type: 'TALK', is_nsfw: false };

    // Load Config via Unified Helper
    const cfg = getAppConfig();
    logToFile(`[Chat] Config Loaded. Main: ${cfg.mainModel.model}, Sub: ${cfg.subModel.model}`);

    // Routing: Judgement -> SUB_MODEL
    const judgerConfig = cfg.subModel;

    // Routing: Generation -> MAIN_MODEL
    const generatorConfig = cfg.mainModel;

    // Helper for fetch with timeout
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

    try {
        if (templatePath) {
            logToFile(`[Chat] Loading Judgement Template...`);
            const template = new PromptTemplate(templatePath);
            const contextVars = {
                worldTime: `Day ${contextData.day}, ${contextData.timeOfDay}`,
                location: contextData.locationName,
                weather: contextData.weather,
                playerName: "Player",
                playerCondition: "Healthy",
                conversationHistory: history.slice(-5),
                userInput: message
            };

            const prompt = template.render(contextVars);

            const judgerPayload = {
                messages: [{ role: 'user', content: prompt }],
                model: judgerConfig.model,
                temperature: 0.1,
            };

            logToFile(`[Chat] Calling Judgement API (${judgerConfig.baseUrl})...`);
            const jResponse = await fetchWithTimeout(`${judgerConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(judgerConfig.apiKey ? { 'Authorization': `Bearer ${judgerConfig.apiKey}` } : {})
                },
                body: JSON.stringify(judgerPayload)
            }, 10000);

            if (jResponse.ok) {
                const jData: any = await jResponse.json();
                let content = jData.choices?.[0]?.message?.content || "";
                content = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();

                try {
                    judgementJson = JSON.parse(content);
                } catch (jsonErr) {
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try { judgementJson = JSON.parse(jsonMatch[0]); } catch (e) { /* ignore */ }
                    }
                }
            }
        }
    } catch (e: any) {
        logToFile("[Chat] Judgement Phase Error:", e.name === 'AbortError' ? 'Timeout' : e.message);
    }

    logToFile("[Chat] Judgement Result:", judgementJson);

    if (judgementJson.is_nsfw) {
        // return "*System*: This action contains inappropriate content.";
        console.warn("[Chat] NSFW flag detected but allowed per user preference.");
    }

    // 3. Response Generation
    // Load System Prompt
    let systemPrompt = 'You are a helpful RPG assistant.';
    let systemPromptPath = '';
    const possibleSysPaths = [
        path.join(__dirname, 'prompts', 'system.md'),
        path.join(process.cwd(), 'main', 'prompts', 'system.md'),
        path.join(process.cwd(), 'frontend', 'main', 'prompts', 'system.md'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        path.join((app as any).getAppPath(), 'main', 'prompts', 'system.md'),
    ];
    for (const p of possibleSysPaths) {
        if (fs.existsSync(p)) { systemPromptPath = p; break; }
    }
    if (systemPromptPath) systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

    // INJECT DYNAMIC CONTEXT
    // We append the dynamic context to the system prompt
    const dynamicContext = `
[Current Situation]
Location: ${contextData.locationName}
Description: ${contextData.locationDesc}
Time: Day ${contextData.day}, ${contextData.timeOfDay}

[Target Persona]
You are acting as: ${contextData.targetName}
${contextData.targetProfile ? `Profile:\n${contextData.targetProfile}` : ''}

[Directive]
1. **BECOME THE CHARACTER**: Adopt the "Tone" and "Personality" completely. Do not sound like an AI assistant.
2. **USE HISTORY**: Refer to the previous conversation history context to maintain continuity.
3. **ATMOSPHERE**: Reflect the current location and situation in your response.
4. **FORMAT**: Follow the [System] format (Italics for actions, Text for speech).
    `.trim();

    systemPrompt += `\n\n${dynamicContext}`;

    const genPayload = {
        messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ],
        model: generatorConfig.model,
        temperature: cfg.temperature // Use config temperature
    };

    logToFile(`[Chat] Calling Generation API (${generatorConfig.model}) with Target: ${contextData.targetName}...`);

    try {
        const gResponse = await fetchWithTimeout(`${generatorConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(generatorConfig.apiKey ? { 'Authorization': `Bearer ${generatorConfig.apiKey}` } : {})
            },
            body: JSON.stringify(genPayload)
        }, 300000); // 300s timeout for Thinking Models

        if (!gResponse.ok) throw new Error(`Generation API Error: ${gResponse.status}`);

        const gData: any = await gResponse.json();
        const reply = gData.choices?.[0]?.message?.content || '...';
        logToFile("[Chat] Generation Success");

        // POST-PERSISTENCE: Save Assistant Response
        if (worldId) {
            try {
                // Find NPC entity ID for linking
                let npcId = targetId;
                if (!npcId && contextData.targetName) {
                    const n = await prisma.entity.findFirst({ where: { worldId, name: contextData.targetName, type: 'ENTITY_NPC' } });
                    if (n) npcId = n.id;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (prisma as any).chat.create({
                    data: {
                        worldId: worldId,
                        chatType: '2', // CHAT_NPC
                        message: reply,
                        entityId: npcId || null
                    }
                });
            } catch (e) {
                console.error("Failed to save assistant chat log:", e);
            }
        }

        return reply;

    } catch (err: any) {
        logToFile("[Chat] Generation Error:", err.name === 'AbortError' ? 'Timeout' : err.message);
        return `Error: ${err.message}`;
    }
});

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import serve from 'electron-serve';
import path from 'path';
import fs from 'fs';
import { PromptTemplate } from './lib/PromptTemplate';
import prisma from './lib/prisma';
import { registerWorldHandlers } from './ipc/worlds';
import { registerGameHandlers } from './ipc/game';
import { logLlmRequest, logLlmResponse } from './lib/logger';
import { updateEntityVariable } from './lib/entityUtils';

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
        title: 'AIRolePlaySim',
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
            const player = await prisma.mEntity.findFirst({
                where: { worldId, type: 'ENTITY_PLAYER' }
            });

            await prisma.tChat.create({
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

    let targetRole = 'NPC';
    let targetAffection = 500; // Default Neutral

    try {
        // Time
        const stepsConst = await prisma.mGlobalConstant.findUnique({ where: { keyName: 'total_steps' } });
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

        const player = await prisma.mEntity.findFirst({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { currentState: true, currentPersona: true, currentParameter: true }
        });

        if (player) {
            // Reconstruct environment
            const pEnv: any = {
                ...(player.currentState?.data as object || {}),
                ...(player.currentPersona?.data as object || {}),
                ...(player.currentParameter?.data as object || {})
            };
            contextData.locationName = pEnv.location || 'Unknown';

            if (pEnv.locationId) {
                // val access if new structure
                const locId = pEnv.locationId.val !== undefined ? pEnv.locationId.val : pEnv.locationId;
                if (locId) {
                    const locEntity = await prisma.mEntity.findUnique({
                        where: { id: locId },
                        include: { currentState: true, currentPersona: true, currentParameter: true }
                    });
                    if (locEntity) {
                        const lEnv: any = {
                            ...(locEntity.currentState?.data as object || {}),
                            ...(locEntity.currentPersona?.data as object || {}),
                            ...(locEntity.currentParameter?.data as object || {})
                        };
                        contextData.locationDesc = locEntity.description || '';
                    }
                }
            }
        }

        // Target NPC Context
        // targetRole and targetAffection are defined in outer scope

        if (targetId) {
            const npcEntity = await prisma.mEntity.findUnique({
                where: { id: targetId },
                include: { currentState: true, currentPersona: true, currentParameter: true }
            });
            if (npcEntity) {
                contextData.targetName = npcEntity.name;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const nEnv: any = {
                    ...(npcEntity.currentState?.data as object || {}),
                    ...(npcEntity.currentPersona?.data as object || {}),
                    ...(npcEntity.currentParameter?.data as object || {})
                };

                // Helper to safely get value from flat structure or legacy profile object
                const getVal = (key: string, legacyKey?: string) => {
                    if (nEnv[key]?.val !== undefined) return nEnv[key].val;
                    if (nEnv[key]?.value !== undefined) return nEnv[key].value; // fallback
                    if (nEnv[key] !== undefined && typeof nEnv[key] !== 'object') return nEnv[key];
                    // Legacy fallback
                    if (nEnv.profile && legacyKey && nEnv.profile[legacyKey]) return nEnv.profile[legacyKey];
                    return null;
                };

                const firstPerson = getVal('firstPerson', 'first_person') || '私';
                const personality = getVal('personality') || 'Standard';
                const tone = getVal('speakingStyle', 'speaking_style') || 'Normal';
                const ending = getVal('ending') || '';
                const role = getVal('role') || 'NPC';
                const gender = getVal('gender') || 'Unknown';

                targetRole = role;

                if (nEnv.affection?.val !== undefined) targetAffection = Number(nEnv.affection.val);
                else if (nEnv.affection?.value !== undefined) targetAffection = Number(nEnv.affection.value);
                else if (nEnv.affection !== undefined && typeof nEnv.affection !== 'object') targetAffection = Number(nEnv.affection);

                // Add to contextData for template use
                Object.assign(contextData, {
                    targetRole,
                    targetPersonality: personality,
                    targetTone: tone,
                    targetFirstPerson: firstPerson,
                    targetEnding: ending,
                    targetGender: gender
                });

                // Generate Full Profile dynamically
                const profileLines = [];
                // Sort keys for stability?
                const keys = Object.keys(nEnv).sort();

                // Prioritize important keys for top of details
                const priorityKeys = ['name', 'race', 'gender', 'ageGroup', 'role', 'personality', 'tone', 'speakingStyle', 'firstPerson', 'ending'];

                // Add specific formatted fields first
                profileLines.push(`**Name**: ${npcEntity.name}`);

                // Add all other environment properties
                for (const key of keys) {
                    if (key === 'name') continue; // Already added
                    const valObj = nEnv[key];
                    // Handle both new structure { value, ... } and legacy raw values
                    let val = valObj;
                    let visible = true; // Default to true if simple value

                    if (valObj && typeof valObj === 'object' && (valObj.val !== undefined || valObj.value !== undefined)) {
                        val = valObj.val !== undefined ? valObj.val : valObj.value;
                        visible = (valObj.vis === 'vis_public') || (valObj.visible === true);
                    }

                    // User requested "ALL" data, so we include even hidden data like personality/thresholds
                    // We can mark them as [Secret] or just list them.
                    // Given this is the PROMPT for the AI acting as the NPC, it NEEDS to know hidden stats.

                    if (val !== undefined && val !== null && val !== '') {
                        // Format the key to be readable (camelCase to Title Case)
                        const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        profileLines.push(`**${readableKey}**: ${val}`);
                    }
                }

                contextData.targetProfile = profileLines.join('\n');

                // Keep keeping specific keys in contextData for legacy prompt support if needed,
                // but targetProfile will be the main source of truth.
                Object.assign(contextData, {
                    targetGender: gender
                });
            }
        }

    } catch (e) {
        console.warn('Failed to fetch context:', e);
    }

    // 2. Action Analysis & Judgement (Local LLM)
    let analysisTemplatePath = '';
    const possibleTemplatePaths = [
        path.join(__dirname, 'prompts', 'action_analysis.md'),
        path.join(process.cwd(), 'main', 'prompts', 'action_analysis.md'),
        path.join(process.cwd(), 'frontend', 'main', 'prompts', 'action_analysis.md'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        path.join((app as any).getAppPath(), 'main', 'prompts', 'action_analysis.md'),
    ];

    for (const p of possibleTemplatePaths) {
        if (fs.existsSync(p)) {
            analysisTemplatePath = p;
            break;
        }
    }

    let analysisResult: any = { actions: [{ type: 'TALK' }], is_refused: false };

    // Load Config via Unified Helper
    const cfg = getAppConfig();
    logToFile(`[Chat] Config Loaded. Main: ${cfg.mainModel.model}, Sub: ${cfg.subModel.model}`);

    // Routing: Analysis -> SUB_MODEL
    const analyzerConfig = cfg.subModel;
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
        if (analysisTemplatePath) {
            logToFile(`[Chat] Loading Analysis Template...`);
            const template = new PromptTemplate(analysisTemplatePath);
            const contextVars = {
                worldTime: `Day ${contextData.day}, ${contextData.timeOfDay}`,
                location: contextData.locationName,
                targetName: contextData.targetName,
                targetRole: targetRole,
                targetAffection: targetAffection,
                userInput: message
            };

            const prompt = template.render(contextVars);

            const analyzerPayload = {
                messages: [{ role: 'user', content: prompt }],
                model: analyzerConfig.model,
                temperature: 0.1
            };

            logToFile(`[Chat] Calling Analysis API (${analyzerConfig.baseUrl})...`);
            logLlmRequest(analyzerConfig.baseUrl, analyzerConfig.model, JSON.stringify(analyzerPayload, null, 2));

            const aResponse = await fetchWithTimeout(`${analyzerConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(analyzerConfig.apiKey ? { 'Authorization': `Bearer ${analyzerConfig.apiKey}` } : {})
                },
                body: JSON.stringify(analyzerPayload)
            }, 180000);

            if (aResponse.ok) {
                const aText = await aResponse.text();
                // console.log("Analysis Raw:", aText);
                let aData: any = {};
                try {
                    aData = JSON.parse(aText);
                } catch (e) {
                    console.warn("[Chat] Analysis API returned non-JSON:", aText.substring(0, 200));
                    // If it's a thinking model returning raw text without JSON?
                    // Just treat the whole text as content if possible, or fail.
                    // For analysis we expect JSON structure usually.
                    // Attempt to treat as { choices: [ { message: { content: ... } } ] } mock if it looks like plain text?
                    // But here we need specific fields. Let's assume failure or try partial parse.
                    aData = { choices: [{ message: { content: aText } }] };
                }

                let content = aData.choices?.[0]?.message?.content || "";
                logLlmResponse(content);
                // Cleaning logic for Thinking Models
                // Remove [THINK]...[/THINK] or [THINK]... EOF style blocks if identifiable
                // Or simply look for the last occurrence of ```json ... ```

                // Strategy 1: Extract json block if exists
                const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/g);
                if (codeBlockMatch) {
                    // Use the LAST code block as reasoning models often output thought code blocks first
                    content = codeBlockMatch[codeBlockMatch.length - 1];
                    content = content.replace(/```json\s*/, "").replace(/```$/, "").trim();
                } else {
                    // Strategy 2: Remove [THINK]...[/THINK] if present
                    content = content.replace(/\[THINK\][\s\S]*?\[\/THINK\]/gi, "").trim();
                    // Also remove open-ended [THINK] if it appears at start and seemingly ends before JSON
                    // This is risky if [/THINK] is missing, but better than failing parse
                    if (content.startsWith('[THINK]')) {
                        const jsonStart = content.indexOf('{');
                        if (jsonStart > -1) {
                            content = content.substring(jsonStart);
                        }
                    }
                }

                // Cleanup common wrappers just in case
                content = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();

                try {
                    analysisResult = JSON.parse(content);
                } catch (jsonErr) {
                    // Fallback: finding the last pair of braces
                    const brackets = content.match(/\{[\s\S]*\}/g);
                    if (brackets) {
                        try {
                            // Try the last match
                            analysisResult = JSON.parse(brackets[brackets.length - 1]);
                        } catch (e) {
                            // Try the first match if last failed
                            try { analysisResult = JSON.parse(brackets[0]); } catch (e2) { /* ignore */ }
                        }
                    }
                }

                // [INTEGRATION FIX] Inject original user input into analysis result
                if (analysisResult && typeof analysisResult === 'object') {
                    analysisResult.original_input = message;
                }
            } else {
                console.warn(`[Chat] Analysis API Error: ${aResponse.status}`);
                try {
                    const errorText = await aResponse.text();
                    logLlmResponse(`Error Body (${aResponse.status}): ${errorText}`);
                } catch (e) {
                    logLlmResponse(`Error Body (${aResponse.status}): <Failed to read body>`);
                }
            }
        } else {
            console.warn("[Chat] Analysis template not found, skipping analysis.");
        }
    } catch (e: any) {
        logToFile("[Chat] Analysis Phase Error:", e.name === 'AbortError' ? 'Timeout' : e.message);
    }

    logToFile("[Chat] Analysis Result:", analysisResult);

    // Apply Analysis to Game State (Time Progression)
    if (worldId && analysisResult.actions) {
        try {
            let stepCost = 0;
            for (const action of analysisResult.actions) {
                // Use AI estimated time consumption if available
                if (typeof action.time_consumption === 'number') {
                    stepCost += action.time_consumption;
                } else {
                    // Fallback defaults
                    if (action.type === 'ACT' || action.type === 'ACTION') stepCost += 300;
                    else if (action.type === 'TALK') stepCost += 100;
                    else if (action.type === 'THOUGHT') stepCost += 0;
                    else if (action.type === 'LOOK') stepCost += 50;
                }
            }

            if (stepCost > 0) {
                const keyName = `steps_${worldId}`;
                let constant = await prisma.mGlobalConstant.findUnique({ where: { keyName } });
                if (!constant) {
                    constant = await prisma.mGlobalConstant.create({ data: { category: 'system', keyName, keyValue: '0' } });
                }
                const newSteps = parseInt(constant.keyValue, 10) + stepCost;
                await prisma.mGlobalConstant.update({
                    where: { keyName },
                    data: { keyValue: newSteps.toString() }
                });
                // Re-calculate local context time if needed, but we used old time for prompt which is fine
            }
        } catch (e) {
            console.error("Failed to update steps from analysis:", e);
        }
    }

    let dynamicContext = "";

    // [INTEGRATION FIX] Pass Analysis JSON to Chat Generation Phase
    if (analysisResult) {
        dynamicContext += `
[Action Analysis]
The user's action has been analyzed by the system as follows. 
Use this to understand the user's detailed intent, target, and implied sentiment.
\`\`\`json
${JSON.stringify(analysisResult, null, 2)}
\`\`\`
`.trim();
        dynamicContext += "\n\n";
    }

    if (analysisResult.is_refused) {
        dynamicContext += `
[IMPORTANT]
The user's action was REFUSED by the character.
Refusal Reason: ${analysisResult.refusal_reason || "Inappropriate or unwilling."}
Reaction: Show rejection, disgust, or refusal to comply. Do NOT perform the requested action.
        `.trim();
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
    // Check if user_prompt.md exists to use as the robust Prompt Template
    let userPromptPath = '';
    const possibleUserPaths = [
        path.join(__dirname, 'prompts', 'user_prompt.md'),
        path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md'),
        path.join(process.cwd(), 'frontend', 'main', 'prompts', 'user_prompt.md'),
    ];
    for (const p of possibleUserPaths) {
        if (fs.existsSync(p)) { userPromptPath = p; break; }
    }

    let messagesForLlm = [];

    if (userPromptPath) {
        logToFile("[Chat] Using User Prompt Template:", userPromptPath);
        const t = new PromptTemplate(userPromptPath);

        // Fetch History for injection
        let historyText = "(No history)";
        if (worldId) {
            const recentChats = await prisma.tChat.findMany({
                where: { worldId },
                orderBy: { id: 'desc' },
                take: 20,
                include: { entity: true }
            });
            // Skip the first one (latest) as it is the current user input
            historyText = recentChats.slice(1).reverse().map((c: any) => {
                let name = 'NPC';
                if (c.chatType === '1') name = 'Player';
                else if (c.chatType === '2') name = c.entity?.name || 'NPC';
                else name = 'System';
                return `[${name}]: ${c.message}`;
            }).join('\n');
        }

        const renderedUserPrompt = t.render({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(contextData as any), // Cast to access new props
            worldTime: `Day ${contextData.day}, ${contextData.timeOfDay}`,
            location: contextData.locationName,
            weather: contextData.weather,
            playerName: 'Player',
            playerCondition: 'Normal',
            conversationHistory: historyText,
            userInput: message
        });

        messagesForLlm = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: renderedUserPrompt }
        ];

    } else {
        // Fallback: Old Dynamic Context Injection
        dynamicContext += `
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

        // [HISTORY FIX] Fetch history from DB
        const historyMsgs = await (async () => {
            if (!worldId) return [];
            const recentChats = await prisma.tChat.findMany({
                where: { worldId },
                orderBy: { id: 'desc' },
                take: 20,
                include: { entity: true }
            });
            return recentChats.reverse().map((c: any) => {
                let role = 'user';
                let speakerName = 'Unknown';
                if (c.chatType === '1') { role = 'user'; speakerName = 'Player'; }
                else if (c.chatType === '2') { role = 'assistant'; speakerName = c.entity?.name || 'Unknown'; }
                else if (c.chatType === '0') { role = 'system'; speakerName = 'System'; }
                return {
                    role: role,
                    content: `[${speakerName}]: ${c.message}`
                };
            });
        })();

        messagesForLlm = [
            { role: 'system', content: systemPrompt },
            ...historyMsgs
        ];
    }

    const genPayload = {
        messages: messagesForLlm,
        model: generatorConfig.model,
        temperature: cfg.temperature // Use config temperature
    };

    logToFile(`[Chat] Calling Generation API (${generatorConfig.model}) with Target: ${contextData.targetName}...`);
    logLlmRequest(generatorConfig.baseUrl, generatorConfig.model, JSON.stringify(genPayload, null, 2));

    try {
        const gResponse = await fetchWithTimeout(`${generatorConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(generatorConfig.apiKey ? { 'Authorization': `Bearer ${generatorConfig.apiKey}` } : {})
            },
            body: JSON.stringify(genPayload)
        }, 300000); // 300s timeout for Thinking Models

        if (!gResponse.ok) {
            const errBody = await gResponse.text();
            throw new Error(`Generation API Error (${gResponse.status}): ${errBody.substring(0, 200)}`);
        }

        const gText = await gResponse.text();
        let gData: any;
        try {
            gData = JSON.parse(gText);
        } catch (e) {
            console.warn("[Chat] Generation API response parse error. Raw:", gText.substring(0, 200));
            // Fallback: If it's just a raw spring of text, wrap it? 
            // Some proxies behave oddly. 
            // But usually this means HTML error page.
            throw new Error(`Generation API returned invalid JSON: ${gText.substring(0, 50)}...`);
        }

        const reply = gData.choices?.[0]?.message?.content || '...';
        logLlmResponse(reply);
        logToFile("[Chat] Generation Success");

        // POST-PERSISTENCE: Save Assistant Response
        if (worldId) {
            try {
                // Find NPC entity ID for linking
                let npcId = targetId;
                if (!npcId && contextData.targetName) {
                    const n = await prisma.mEntity.findFirst({ where: { worldId, name: contextData.targetName, type: 'ENTITY_NPC' } });
                    if (n) npcId = n.id;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (prisma as any).tChat.create({
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

        // 4. Post-Processing: Affection Judgment
        if (worldId && targetId && !analysisResult.is_refused) {
            // Run without awaiting to avoid blocking UI response
            (async () => {
                try {
                    let affectionPromptPath = '';
                    const possibleAffectionPaths = [
                        path.join(__dirname, 'prompts', 'affection_analysis.md'),
                        path.join(process.cwd(), 'main', 'prompts', 'affection_analysis.md'),
                        path.join(process.cwd(), 'frontend', 'main', 'prompts', 'affection_analysis.md'),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        path.join((app as any).getAppPath(), 'main', 'prompts', 'affection_analysis.md'),
                    ];
                    for (const p of possibleAffectionPaths) {
                        if (fs.existsSync(p)) { affectionPromptPath = p; break; }
                    }

                    if (!affectionPromptPath) return;

                    const pState = await prisma.tEntityState.findUnique({ where: { entityId: targetId } });
                    if (!pState) return;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const nEnv: any = pState.data || {};
                    let currentAffection = 0;
                    // Safely extract numeric affection
                    if (nEnv.affection?.val !== undefined) currentAffection = Number(nEnv.affection.val) || 0;
                    else if (nEnv.affection?.value !== undefined) currentAffection = Number(nEnv.affection.value) || 0;
                    else if (nEnv.affection !== undefined && typeof nEnv.affection !== 'object') currentAffection = Number(nEnv.affection) || 0;

                    const afTemplate = new PromptTemplate(affectionPromptPath);

                    // Safely access properties on contextData
                    // Cast contextData to any to avoid "Property does not exist" TS error for dynamic props like targetPersonality
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const ctxAny = contextData as any;

                    const afPrompt = afTemplate.render({
                        targetName: ctxAny.targetName,
                        targetPersonality: ctxAny.targetPersonality || 'Unknown',
                        currentAffection: currentAffection,
                        userInput: message,
                        actionType: analysisResult.actions?.[0]?.type || 'TALK',
                        npcResponse: reply // Using the generated reply
                    });

                    // Use SUB_MODEL for Affection Judgment
                    const afPayload = {
                        messages: [{ role: 'user', content: afPrompt }],
                        model: analyzerConfig.model,
                        temperature: 0.1
                    };

                    logToFile("[Chat] Calling Affection Judgment API...");
                    const afResponse = await fetch(`${analyzerConfig.baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(analyzerConfig.apiKey ? { 'Authorization': `Bearer ${analyzerConfig.apiKey}` } : {})
                        },
                        body: JSON.stringify(afPayload)
                    });

                    if (afResponse.ok) {
                        const afText = await afResponse.text();
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const afData: any = JSON.parse(afText);
                            let afContent = afData.choices?.[0]?.message?.content || "{}";

                            // Robust Extraction Strategy
                            const jsonBlock = afContent.match(/```json\s*([\s\S]*?)\s*```/);
                            if (jsonBlock) {
                                afContent = jsonBlock[1].trim();
                            } else {
                                // Fallback: try to find the first '{' and last '}'
                                const start = afContent.indexOf('{');
                                const end = afContent.lastIndexOf('}');
                                if (start !== -1 && end !== -1 && end > start) {
                                    afContent = afContent.substring(start, end + 1);
                                }
                                // If plain text, might strip markdown delimiters if present at edges
                                afContent = afContent.replace(/^```json\s?/, '').replace(/```$/, '').trim();
                            }

                            const afResult = JSON.parse(afContent);
                            logToFile("[Chat] Affection Result:", afResult);

                            if (afResult.affection_delta && afResult.affection_delta !== 0) {
                                const newAffection = currentAffection + Number(afResult.affection_delta);

                                // Update DB (T_ & H_)
                                try {
                                    await updateEntityVariable(
                                        targetId,
                                        'state',
                                        'affection',
                                        newAffection,
                                        'vis_private'
                                    );
                                    logToFile(`[Chat] Updated Affection: ${currentAffection} -> ${newAffection} (Reason: ${afResult.reason})`);
                                } catch (e) {
                                    console.error("Failed to update affection:", e);
                                }
                            }
                        } catch (parseErr: any) {
                            console.error("Affection API JSON Parse Error:", parseErr.message);
                            logToFile(`[Chat] Affection Response invalid JSON: ${afText.substring(0, 200)}...`);
                        }
                    } else {
                        const errText = await afResponse.text();
                        logToFile(`[Chat] Affection API Error (${afResponse.status}): ${errText}`);
                    }

                } catch (e) {
                    console.error("Affection update task failed:", e);
                }
            })();
        }

        return reply;

    } catch (err: any) {
        logToFile("[Chat] Generation Error:", err.name === 'AbortError' ? 'Timeout' : err.message);
        return `Error: ${err.message}`;
    }
});

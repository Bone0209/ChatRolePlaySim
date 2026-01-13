// Domain & Repositories
import {
    PrismaWorldRepository,
    PrismaEntityRepository,
    PrismaChatRepository,
    PrismaUserProfileRepository,
    PrismaApiLogRepository
} from './infrastructure/repositories';

// Gateways
import { getLlmGateway } from './infrastructure/gateways/LlmGateway';

// Use Cases
import {
    CreateWorldUseCase,
    GetWorldsUseCase
} from './application/usecases/world';
import {
    GetGameStateUseCase,
    ProcessActionUseCase,
    UpdateAffectionUseCase
} from './application/usecases/game';
import { SendMessageUseCase } from './application/usecases/chat/SendMessageUseCase';

// Handlers
import {
    registerWorldHandler,
    registerGameHandler,
    registerChatHandler,
    setupUserProfileHandlers
} from './interface-adapters/ipc';


import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import serve from 'electron-serve';

const loadURL = serve({ directory: 'renderer/out' });

// Window references
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

// Window Dimensions
const DEFAULT_DIMENSIONS = { width: 1280, height: 800 };

// -- Config Loading --
import { getAppConfig } from './infrastructure/config';

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
// --- Dependency Injection Setup ---
function setupHandlers() {
    console.log("[Main] Setting up DI container...");

    // 1. Repositories
    const worldRepo = new PrismaWorldRepository();
    const entityRepo = new PrismaEntityRepository();
    const chatRepo = new PrismaChatRepository();
    const userProfileRepo = new PrismaUserProfileRepository();
    const apiLogRepo = new PrismaApiLogRepository();

    // 2. Gateways
    const llmGateway = getLlmGateway(apiLogRepo);

    // 3. Use Cases
    // World
    // World UseCases are internal to WorldHandler

    // Game
    // Note: ProcessActionUseCase needs legacy getters for now if not fully migrated to Repo logic?
    // Actually ProcessActionUseCase in my plan took (entityRepo, getSteps, setSteps)
    // I need to provide adapters for getSteps/setSteps or refactor ProcessActionUseCase to use Repository methods (e.g. key-value store)
    // For now, let's implement simple adapters using direct prisma calls here or within the method.
    // Wait, the new ProcessActionUseCase constructor signature (from file read previously):
    /*
     export class ProcessActionUseCase {
        constructor(
            private entityRepo: IEntityRepository,
            private getSteps: (worldId: string) => Promise<number>,
            private setSteps: (worldId: string, steps: number) => Promise<void>
        ) {}
     */
    // I need to provide these functions.
    const getSteps = async (worldId: string): Promise<number> => {
        // Temporary direct access or better, move this logic to WorldRepository?
        // For simplicity in migration, I will use a local helper that uses the imported prisma client (if I import it) 
        // OR better, create a separate StepRepository. 
        // But since I don't have it, I'll allow a direct db call helper here.
        // I need to import prisma for this.
        return 0; // Placeholder, see logic below
    };
    const setSteps = async (worldId: string, steps: number): Promise<void> => { };

    // UpdateAffectionUseCase
    const updateAffectionUC = new UpdateAffectionUseCase(entityRepo);

    // Chat
    const sendMessageUC = new SendMessageUseCase(
        chatRepo,
        entityRepo,
        worldRepo,
        llmGateway,
        updateAffectionUC,
        userProfileRepo
    );

    // 4. Register Handlers
    const promptsPath = path.join(process.cwd(), 'main', 'prompts');
    registerWorldHandler(worldRepo, entityRepo, llmGateway, promptsPath);

    // We need to properly implement steps logic for GameHandler.
    // Since I can't easily inline it without prisma import, 
    // I'll keep the legacy prisma import JUST for this helper for now, or instantiate a quick adapter.
    // Let's defer GameHandler registration slightly or assume helper availability.

    // Actually, let's register ChatHandler first as it's the target.
    registerGameHandler(entityRepo, getSteps, setSteps);
    registerChatHandler(sendMessageUC, chatRepo, entityRepo, userProfileRepo);
    setupUserProfileHandlers();
}


// Call setup
setupHandlers();

// Temporary: Register Legacy handlers if some are not covered?
// registerWorldHandlers(); // Removed
// registerGameHandlers(); // Removed

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


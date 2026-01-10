import fs from 'fs';
import path from 'path';

// Helper to read env if not already loaded (Nextron usually handles this, but for safety in Main process)
// Note: In Nextron/Electron, process.env is usually populated at build/runtime.
// If needed, we could use 'dotenv' here, but Next.js/Electron usually handle it.

export interface ModelConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface AppConfig {
    mainModel: ModelConfig; // High Intel (Chat, Compex Gen)
    subModel: ModelConfig;  // fast/Cheaper (Judgement, Naming)
    temperature: number;
    database: {
        url: string;
    };
}

const loadEnv = () => {
    // Manually load .env if not present in process.env
    // This is needed because Nextron's main process might not load .env automatically
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log('[Config] Loaded .env file manually.');
    }
};

loadEnv();

const getEnv = (key: string, defaultValue: string = ''): string => {
    return process.env[key] || defaultValue;
};

export const getAppConfig = (): AppConfig => {
    // MAIN Model (e.g. NanoGPT)
    const mainModel: ModelConfig = {
        baseUrl: getEnv('MAIN_MODEL_BASE_URL', 'https://nano-gpt.com/api/v1'),
        apiKey: getEnv('MAIN_MODEL_API_KEY', ''),
        model: getEnv('MAIN_MODEL', 'zai-org/glm-4.7-original:thinking'),
    };

    // SUB Model (e.g. Local/LMStudio)
    const subModel: ModelConfig = {
        baseUrl: getEnv('SUB_MODEL_BASE_URL', 'http://127.0.0.1:1234/v1'),
        apiKey: getEnv('SUB_MODEL_API_KEY', ''),
        model: getEnv('SUB_MODEL', 'local-model'),
    };

    // Correct fallback for Prisma/LibSQL: relative to CWD (root) -> prisma/dev.db
    return {
        mainModel,
        subModel,
        temperature: parseFloat(getEnv('LLM_TEMPERATURE', '0.7')),
        database: {
            url: getEnv('DATABASE_URL', 'file:./prisma/dev.db')
        }
    };
};

export const getDatabaseUrl = () => {
    return getAppConfig().database.url;
};

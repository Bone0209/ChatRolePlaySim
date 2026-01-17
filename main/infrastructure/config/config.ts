/**
 * config.ts - アプリケーション設定
 * 
 * 環境変数から設定を読み込み、型安全なConfigオブジェクトを提供します。
 */

import fs from 'fs';
import path from 'path';

export interface ModelConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface AppConfig {
    mainModel: ModelConfig;
    subModel: ModelConfig;
    temperature: number;
    database: {
        url: string;
    };
}

/**
 * .envファイルを手動でロード
 * Nextron/Electronのメインプロセスでは自動ロードされない場合があるため
 */
const loadEnv = () => {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"](.*)['"]\$/, '$1');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log('[Config] Loaded .env file manually.');
    }
};

loadEnv();

/**
 * 環境変数を取得（デフォルト値付き）
 */
const getEnv = (key: string, defaultValue: string = ''): string => {
    return process.env[key] || defaultValue;
};

/**
 * アプリケーション設定を取得
 */
export const getAppConfig = (): AppConfig => {
    const mainModel: ModelConfig = {
        baseUrl: getEnv('MAIN_MODEL_BASE_URL', 'https://nano-gpt.com/api/v1'),
        apiKey: getEnv('MAIN_MODEL_API_KEY', ''),
        model: getEnv('MAIN_MODEL', 'zai-org/glm-4.7-original:thinking'),
    };

    const subModel: ModelConfig = {
        baseUrl: getEnv('SUB_MODEL_BASE_URL', 'http://127.0.0.1:1234/v1'),
        apiKey: getEnv('SUB_MODEL_API_KEY', ''),
        model: getEnv('SUB_MODEL', 'local-model'),
    };

    let dbUrl = getEnv('DATABASE_URL', 'file:./prisma/dev.db');
    if (dbUrl.startsWith('file:./')) {
        // Resolve relative path to absolute path to avoid cwd issues in Electron
        const relativePath = dbUrl.substring('file:'.length);
        const absolutePath = path.join(process.cwd(), relativePath);
        dbUrl = `file:${absolutePath}`;
    }

    return {
        mainModel,
        subModel,
        temperature: parseFloat(getEnv('LLM_TEMPERATURE', '0.7')),
        database: {
            url: dbUrl
        }
    };
};

/**
 * データベースURLを取得
 */
export const getDatabaseUrl = (): string => {
    return getAppConfig().database.url;
};

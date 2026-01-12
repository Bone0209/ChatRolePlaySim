/**
 * logger.ts - LLMリクエスト/レスポンスのロギング
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const logDir = isDev
    ? path.join(process.cwd(), 'logs')
    : path.join(app.getPath('userData'), 'logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logPath = path.join(logDir, 'llm.log');
console.log(`[Logger] Initialize: ${logPath}`);

const getCurrentTimestamp = (): string => new Date().toISOString();

/**
 * LLMリクエストをログに記録
 */
export const logLlmRequest = (url: string, model: string, prompt: string): void => {
    const timestamp = getCurrentTimestamp();
    const logEntry = `
[${timestamp}] [REQ]
URL: ${url}
Model: ${model}
Payload:
${prompt}
--------------------------------------------------
`;
    fs.appendFileSync(logPath, logEntry);
};

/**
 * LLMレスポンスをログに記録
 */
export const logLlmResponse = (response: string): void => {
    const timestamp = getCurrentTimestamp();
    const logEntry = `
[${timestamp}] [RES]
${response}
==================================================
`;
    fs.appendFileSync(logPath, logEntry);
};

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

const getCurrentTimestamp = () => new Date().toISOString();

export const logLlmRequest = (url: string, model: string, prompt: string) => {
    const timestamp = getCurrentTimestamp();
    // Escape newlines in prompt for single-line log or keep as block?
    // User probably wants to read it, so keeping newlines might be better but separated.
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

export const logLlmResponse = (response: string) => {
    const timestamp = getCurrentTimestamp();
    const logEntry = `
        [${timestamp}][RES]
${response}
==================================================
`;
    fs.appendFileSync(logPath, logEntry);
};

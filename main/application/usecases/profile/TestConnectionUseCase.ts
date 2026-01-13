
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class TestConnectionUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(target: 'first' | 'second'): Promise<{ success: boolean; message: string }> {
        try {
            const prefix = target === 'first' ? 'sys.llm.first' : 'sys.llm.second';
            const apiKeySetting = await this.repository.getGlobalSetting(`${prefix}.api_key`);
            const endpointSetting = await this.repository.getGlobalSetting(`${prefix}.api_endpoint`);
            const modelSetting = await this.repository.getGlobalSetting(`${prefix}.model`);

            if (!apiKeySetting?.keyValue) return { success: false, message: 'API Key is missing' };
            if (!endpointSetting?.keyValue) return { success: false, message: 'Endpoint is missing' };

            const apiKey = apiKeySetting.keyValue;
            const endpoint = endpointSetting.keyValue;
            const model = modelSetting?.keyValue || '';

            // Simple connection test (list models or dummy completion)
            // Assuming OpenAI-compatible endpoint
            const url = endpoint.endsWith('/v1') ? `${endpoint}/models` : `${endpoint}/v1/models`;

            console.log(`Testing connection to: ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text();
                return { success: false, message: `HTTP Error: ${response.status} ${text}` };
            }

            const data = await response.json();
            // Basic validation that we got JSON back
            return { success: true, message: 'Connection successful' };

        } catch (error: any) {
            return { success: false, message: error.message || 'Connection failed' };
        }
    }
}

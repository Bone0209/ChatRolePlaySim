
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class InitializeGlobalSettingsUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute() {
        const defaults = [
            { key: 'sys.llm.first.api_key', value: '', type: 'string' },
            { key: 'sys.llm.first.api_endpoint', value: '', type: 'string' },
            { key: 'sys.llm.first.model', value: '', type: 'string' },
            { key: 'sys.llm.first.context', value: '4096', type: 'number' },
            // Secondary
            { key: 'sys.llm.second.api_key', value: '', type: 'string' },
            { key: 'sys.llm.second.api_endpoint', value: '', type: 'string' },
            { key: 'sys.llm.second.model', value: '', type: 'string' },
            { key: 'sys.llm.second.context', value: '4096', type: 'number' },
        ];

        for (const d of defaults) {
            // Only create if not exists
            const existing = await this.repository.getGlobalSetting(d.key);
            if (!existing) {
                await this.repository.updateGlobalSetting(d.key, d.value, d.type);
            }
        }
    }
}

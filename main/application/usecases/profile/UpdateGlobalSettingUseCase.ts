
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class UpdateGlobalSettingUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(key: string, value: string, type: string) {
        return await this.repository.updateGlobalSetting(key, value, type);
    }
}


import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class UpdateProfileSettingUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(profileId: number, key: string, value: string, type: string) {
        return await this.repository.updateProfileSetting(profileId, key, value, type);
    }
}

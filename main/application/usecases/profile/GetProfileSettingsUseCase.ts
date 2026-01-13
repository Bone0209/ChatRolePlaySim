
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class GetProfileSettingsUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(profileId: number) {
        const settings = await this.repository.getProfileSettings(profileId);

        // Transform to simple key-value object or keep as array?
        // Array is better for UI table editor: { key, value, type }
        return settings;
    }
}

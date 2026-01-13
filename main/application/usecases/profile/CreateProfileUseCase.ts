
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class CreateProfileUseCase {
    constructor(private userProfileRepository: PrismaUserProfileRepository) { }

    async execute(name: string): Promise<void> {
        // Create the profile list entry
        const profile = await this.userProfileRepository.createProfile(name);

        // Add default settings
        // "PlayerName"
        await this.userProfileRepository.updateProfileSetting(profile.id, 'PlayerName', name, 'string');
        // "PlayerGender"
        await this.userProfileRepository.updateProfileSetting(profile.id, 'PlayerGender', '', 'string');
        // "PlayerDescription"
        await this.userProfileRepository.updateProfileSetting(profile.id, 'PlayerDescription', '', 'string');
    }
}

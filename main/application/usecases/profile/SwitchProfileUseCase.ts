
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class SwitchProfileUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(profileId: number) {
        // Validate profile exists (optional but good practice)
        // For now assuming ID is valid from UI list.

        // Update global setting
        await this.repository.updateGlobalSetting(
            'sys.active_profile',
            profileId.toString(),
            'number'
        );

        return { success: true, activeId: profileId };
    }
}

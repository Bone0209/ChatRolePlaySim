
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class GetProfileListUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute() {
        // Get profiles
        const profiles = await this.repository.getProfileList();

        // Get active profile
        const activeSetting = await this.repository.getGlobalSetting('sys.active_profile');
        const activeId = activeSetting ? parseInt(activeSetting.keyValue) : null;

        return {
            profiles,
            activeId,
        };
    }
}

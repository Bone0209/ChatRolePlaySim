
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class GetGlobalSettingsUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute() {
        return await this.repository.getGlobalSettings();
    }
}

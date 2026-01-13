
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class DeleteProfileSettingUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(listId: number, keyName: string): Promise<void> {
        await this.repository.deleteProfileSetting(listId, keyName);
    }
}

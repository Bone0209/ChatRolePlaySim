
import { PrismaUserProfileRepository } from '../../../infrastructure/repositories/PrismaUserProfileRepository';

export class DeleteProfileUseCase {
    constructor(private repository: PrismaUserProfileRepository) { }

    async execute(id: number): Promise<void> {
        await this.repository.deleteProfile(id);
    }
}

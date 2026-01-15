import prisma from '../database/prisma';
import { GlobalConstantRepository } from '../../domain/repositories/IGlobalConstantRepository';

export class PrismaGlobalConstantRepository implements GlobalConstantRepository {
    async findByCategory(category: string): Promise<{ keyName: string; keyValue: string }[]> {
        const results = await (prisma as any).mGlobalConstant.findMany({
            where: { category }
        });
        return results;
    }

    async getValue(keyName: string): Promise<string | null> {
        const result = await (prisma as any).mGlobalConstant.findUnique({
            where: { keyName }
        });
        return result ? result.keyValue : null;
    }
}

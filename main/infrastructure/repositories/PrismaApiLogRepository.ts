import { IApiLogRepository, ApiLogData } from '../../domain/repositories/IApiLogRepository';
import prisma from '../database/prisma';

export class PrismaApiLogRepository implements IApiLogRepository {
    async create(data: ApiLogData): Promise<void> {
        if (!prisma) {
            console.error('Prisma client not initialized');
            return;
        }

        try {
            await (prisma as any).tApiLog.create({
                data: {
                    apiType: data.apiType,
                    modelName: data.modelName,
                    request: data.request,
                    response: data.response,
                    statusCode: data.statusCode,
                    errorMessage: data.errorMessage,
                    executionTimeMs: data.executionTimeMs,
                    worldId: data.worldId,
                    entityId: data.entityId,
                },
            });
        } catch (error) {
            console.error('Failed to create api log:', error);
        }
    }
}

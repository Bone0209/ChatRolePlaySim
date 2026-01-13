export interface ApiLogData {
    apiType: string;
    modelName: string;
    request: string;
    response: string;
    statusCode?: number;
    errorMessage?: string;
    executionTimeMs?: number;
    worldId?: string;
    entityId?: string;
}

export interface IApiLogRepository {
    create(data: ApiLogData): Promise<void>;
}

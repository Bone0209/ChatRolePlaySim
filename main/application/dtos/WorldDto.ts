/**
 * WorldDto - ワールド情報のDTO
 */

export interface WorldDto {
    id: string;
    name: string;
    prompt: string;
    createdAt: string;
}

/**
 * ワールド作成リクエストDTO
 */
export interface CreateWorldRequestDto {
    id: string;
    name: string;
    prompt: string;
    entities: CreateEntityRequestDto[];
}

/**
 * エンティティ作成リクエストDTO
 */
export interface CreateEntityRequestDto {
    id: string;
    type: 'ENTITY_PLAYER' | 'ENTITY_NPC';
    name: string;
    description?: string;
    environment: Record<string, any>;
}

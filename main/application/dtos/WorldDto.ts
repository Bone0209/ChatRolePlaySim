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
    entities: WorldEntityConfig[];
}

/**
 * ワールド作成時の初期エンティティ設定
 */
export interface WorldEntityConfig {

    id: string;
    type: 'ENTITY_PLAYER' | 'ENTITY_NPC';
    name: string;
    description?: string;
    environment: Record<string, any>;
}

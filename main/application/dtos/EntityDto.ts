/**
 * EntityDto - エンティティ情報のDTO
 */

export interface EntityDto {
    id: string;
    worldId: string;
    type: string;
    name: string;
    description: string;
    locationId?: string;
    attributes: Record<string, any>; // 簡略化または詳細
}

export interface CreateEntityRequestDto {
    worldId: string;
    type: string;
    name: string;
    description: string;
    initialLocationId?: string;
    attributes?: Record<string, any>; // 初期パラメータなど
}

export interface GetLocationEntitiesRequestDto {
    worldId: string;
    locationId: string;
}

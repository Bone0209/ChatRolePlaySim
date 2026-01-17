/**
 * LocationDto - ロケーション情報のDTO
 */

export interface LocationDto {
    id: string;
    worldId: string;
    name: string;
    description: string;
    attributes: Record<string, string>; // 表示用に簡略化
}

export interface CreateLocationRequestDto {
    worldId: string;
    name: string;
    description: string;
    attributes?: Record<string, string>;
}

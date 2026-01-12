/**
 * GameStateDto - ゲーム状態を表すDTO
 * 
 * IPC層やUI層に渡すためのデータ転送オブジェクト
 */

/** NPC情報のDTO */
export interface NpcInfoDto {
    id: string;
    name: string;
    role: string;
}

/**
 * ゲーム状態DTO
 */
export interface GameStateDto {
    /** 経過ステップ総数 */
    totalSteps: number;
    /** 現在の日数 */
    day: number;
    /** 時間帯 */
    timeOfDay: string;
    /** 現在のステップ（日内） */
    currentStep: number;
    /** 現在地名 */
    locationName: string;
    /** 現在地ID */
    locationId: string;
    /** 現在地にいるNPC一覧 */
    npcs: NpcInfoDto[];
}

/**
 * デフォルトのゲーム状態を作成
 */
export function createDefaultGameState(): GameStateDto {
    return {
        totalSteps: 0,
        day: 1,
        timeOfDay: 'Morning',
        currentStep: 0,
        locationName: 'Unknown',
        locationId: '',
        npcs: []
    };
}

/**
 * IEntityRepository - GameEntityリポジトリのインターフェース
 * 
 * エンティティ（プレイヤー、NPC）のCRUD操作と状態更新を定義します。
 */

import { GameEntity, EntityType } from '../entities';
import { ParameterValue } from '../value-objects';

/** パラメータカテゴリの型 */
export type ParameterCategory = 'state' | 'persona' | 'parameter';

/**
 * エンティティリポジトリインターフェース
 */
export interface IEntityRepository {
    /**
     * IDでエンティティを検索
     * @param id エンティティID
     * @returns エンティティ、存在しない場合はnull
     */
    findById(id: string): Promise<GameEntity | null>;

    /**
     * ワールドIDでエンティティを検索
     * @param worldId ワールドID
     * @returns エンティティの配列
     */
    findByWorldId(worldId: string): Promise<GameEntity[]>;

    /**
     * 種類でエンティティを検索
     * @param type エンティティの種類
     * @param worldId オプショナル: ワールドIDで絞り込み
     * @returns エンティティの配列
     */
    findByType(type: EntityType, worldId?: string): Promise<GameEntity[]>;

    /**
     * プレイヤーエンティティを取得
     * @param worldId ワールドID
     * @returns プレイヤーエンティティ、存在しない場合はnull
     */
    findPlayer(worldId: string): Promise<GameEntity | null>;

    /**
     * 同じ場所にいるNPCを検索
     * @param locationId 場所ID
     * @param worldId ワールドID
     * @returns NPCエンティティの配列
     */
    findNpcsByLocation(locationId: string, worldId: string): Promise<GameEntity[]>;

    /**
     * エンティティを保存（新規作成または更新）
     * @param entity 保存するエンティティ
     * @returns 保存されたエンティティ
     */
    save(entity: GameEntity): Promise<GameEntity>;

    /**
     * エンティティの特定パラメータを更新し、履歴を記録
     * @param entityId エンティティID
     * @param category パラメータカテゴリ
     * @param key パラメータキー
     * @param value 新しい値
     */
    updateParameter(
        entityId: string,
        category: ParameterCategory,
        key: string,
        value: ParameterValue<unknown>
    ): Promise<void>;

    /**
     * エンティティを削除
     * @param id 削除するエンティティのID
     */
    delete(id: string): Promise<void>;
}

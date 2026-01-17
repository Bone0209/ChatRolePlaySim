/**
 * ILocationRepository - Locationリポジトリのインターフェース
 */

import { Location } from '../entities/Location';

export interface ILocationRepository {
    /**
     * IDでロケーションを検索
     */
    findById(id: string): Promise<Location | null>;

    /**
     * ワールドIDでロケーション一覧を検索
     */
    findByWorldId(worldId: string): Promise<Location[]>;

    /**
     * ロケーションを保存（作成・更新）
     */
    save(location: Location): Promise<Location>;

    /**
     * ロケーションを削除
     */
    delete(id: string): Promise<void>;
}

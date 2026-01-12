/**
 * IWorldRepository - Worldリポジトリのインターフェース
 * 
 * ドメイン層で定義され、インフラ層で実装されます。
 * これにより、ドメイン層はデータベースの詳細に依存しません。
 */

import { World } from '../entities';

/**
 * ワールドリポジトリインターフェース
 */
export interface IWorldRepository {
    /**
     * IDでワールドを検索
     * @param id ワールドID
     * @returns ワールド、存在しない場合はnull
     */
    findById(id: string): Promise<World | null>;

    /**
     * すべてのワールドを取得
     * @returns ワールドの配列
     */
    findAll(): Promise<World[]>;

    /**
     * ワールドを保存（新規作成または更新）
     * @param world 保存するワールド
     * @returns 保存されたワールド
     */
    save(world: World): Promise<World>;

    /**
     * ワールドを削除
     * @param id 削除するワールドのID
     */
    delete(id: string): Promise<void>;
}

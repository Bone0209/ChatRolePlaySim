/**
 * IChatRepository - ChatMessageリポジトリのインターフェース
 */

import { ChatMessage } from '../entities';

/**
 * チャットリポジトリインターフェース
 */
export interface IChatRepository {
    /**
     * ワールドのチャット履歴を取得
     * @param worldId ワールドID
     * @param limit 取得する最大件数（オプション）
     * @returns チャットメッセージの配列（古い順）
     */
    findByWorldId(worldId: string, limit?: number): Promise<ChatMessage[]>;

    /**
     * チャットメッセージを保存
     * @param message 保存するメッセージ
     * @returns 保存されたメッセージ（IDが採番される）
     */
    save(message: ChatMessage): Promise<ChatMessage>;

    /**
     * ワールドのチャット履歴を削除
     * @param worldId ワールドID
     */
    deleteByWorldId(worldId: string): Promise<void>;
}

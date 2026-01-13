/**
 * ChatHandler - チャット関連のIPCハンドラ
 */

import { ipcMain } from 'electron';
import { SendMessageUseCase } from '../../application/usecases/chat/SendMessageUseCase';
import { IChatRepository } from '../../domain/repositories/IChatRepository';

import { IEntityRepository } from '../../domain/repositories/IEntityRepository';

/**
 * チャットIPCハンドラを登録
 */
export function registerChatHandler(
    useCase: SendMessageUseCase,
    chatRepository: IChatRepository,
    entityRepository: IEntityRepository
) {
    console.log('[IPC] Registering chat handlers...');

    // チャット送信
    ipcMain.handle('chat', async (event, params: {
        message: string;
        worldId: string;
        targetId?: string;
        history?: Array<{ role: string; content: string }>;
    }) => {
        try {
            console.log(`[ChatHandler] Processing chat for world ${params.worldId}`);

            const response = await useCase.execute({
                worldId: params.worldId,
                message: params.message,
                targetId: params.targetId,
                history: params.history
            });

            return response;
        } catch (e) {
            console.error('[ChatHandler] Error:', e);
            throw e; // フロントエンドにエラーを伝播
        }
    });

    // チャット履歴取得
    ipcMain.handle('game:get-chat-history', async (event, worldId: string) => {
        if (!worldId) return [];

        const messages = await chatRepository.findByWorldId(worldId);

        // フロントエンド用形式に変換 (Promise.allで並列処理)
        return Promise.all(messages.map(async msg => {
            let speakerName = 'NPC';

            if (msg.isFromPlayer()) {
                speakerName = 'Player';
            } else if (msg.entityId) {
                // エンティティIDから名前を取得
                const entity = await entityRepository.findById(msg.entityId);
                if (entity) {
                    speakerName = entity.name;
                }
            }

            return {
                role: msg.getLlmRole(),
                content: msg.message,
                speakerName: speakerName,
                entityId: msg.entityId
            };
        }));
    });
}

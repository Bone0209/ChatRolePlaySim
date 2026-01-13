/**
 * ChatHandler - チャット関連のIPCハンドラ
 */

import { ipcMain } from 'electron';
import { SendMessageUseCase } from '../../application/usecases/chat/SendMessageUseCase';
import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { PrismaUserProfileRepository } from '../../infrastructure/repositories/PrismaUserProfileRepository';

/**
 * チャットIPCハンドラを登録
 */
export function registerChatHandler(
    useCase: SendMessageUseCase,
    chatRepository: IChatRepository,
    entityRepository: IEntityRepository,
    userProfileRepository: PrismaUserProfileRepository
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

            return { success: true, data: response };
        } catch (e: any) {
            console.error('[ChatHandler] Error:', e);
            // Return error as object instead of throwing to prevent Electron error dialog
            return {
                success: false,
                error: e.name || 'Error',
                message: e.message || 'Unknown error occurred'
            };
        }
    });

    // チャット履歴取得
    ipcMain.handle('game:get-chat-history', async (event, worldId: string) => {
        if (!worldId) return [];

        const messages = await chatRepository.findByWorldId(worldId);

        // Fetch player name from active profile
        let playerName = 'Player';
        try {
            const globalSettings = await userProfileRepository.getGlobalSettings();
            const activeProfileIdSetting = globalSettings.find(s => s.keyName === 'sys.active_profile');
            if (activeProfileIdSetting && activeProfileIdSetting.keyValue) {
                const profileId = parseInt(activeProfileIdSetting.keyValue);
                const profileSettings = await userProfileRepository.getProfileSettings(profileId);
                const nameSetting = profileSettings.find(s => s.keyName === 'PlayerName');
                if (nameSetting && nameSetting.keyValue) {
                    playerName = nameSetting.keyValue;
                }
            }
        } catch (e) {
            console.warn('[ChatHandler] Failed to load player name:', e);
        }

        // フロントエンド用形式に変換 (Promise.allで並列処理)
        return Promise.all(messages.map(async msg => {
            let speakerName = 'NPC';

            if (msg.isFromPlayer()) {
                speakerName = playerName;
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

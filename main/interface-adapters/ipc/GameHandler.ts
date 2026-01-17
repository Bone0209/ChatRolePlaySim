/**
 * GameHandler - ゲーム関連のIPCハンドラ
 * 
 * ゲーム状態の取得やアクション処理を担当します。
 */

import { ipcMain } from 'electron';
import { IEntityRepository } from '../../domain/repositories';
import { GetGameStateUseCase, ProcessActionUseCase, ActionMode } from '../../application/usecases/game';
import { EntityDetailDto } from '../../application/dtos';

/**
 * ゲームIPCハンドラを登録
 */
export function registerGameHandler(
    entityRepository: IEntityRepository,
    getSteps: (worldId: string) => Promise<number>,
    setSteps: (worldId: string, steps: number) => Promise<void>
) {
    console.log('[IPC] Registering game handlers...');

    // ゲーム状態取得
    ipcMain.handle('game:get-state', async (event, worldId: string) => {
        if (!worldId) {
            return { totalSteps: 0, day: 1, timeOfDay: 'Morning', currentStep: 0, locationName: 'Unknown', locationId: '', npcs: [] };
        }

        const useCase = new GetGameStateUseCase(entityRepository, getSteps);
        return useCase.execute(worldId);
    });

    // アクション処理
    ipcMain.handle('game:process-action', async (event, { mode, content, worldId }: { mode: string, content: string, worldId: string }) => {
        if (!worldId) {
            throw new Error('World ID is required');
        }

        const useCase = new ProcessActionUseCase(entityRepository, getSteps, setSteps);
        return useCase.execute(worldId, mode as ActionMode);
    });

    // エンティティ詳細取得
    ipcMain.handle('game:get-entity', async (event, entityId: string) => {
        if (!entityId) return null;

        const entity = await entityRepository.findById(entityId);
        if (!entity) return null;

        // DTOに変換
        const detail: EntityDetailDto = {
            id: entity.id,
            name: entity.name,
            type: entity.type,
            description: entity.description,
            environment: entity.getAllParameters()
        };

        return detail;
    });

    // ロケーション内のエンティティ一覧取得
    ipcMain.handle('game:get-location-entities', async (event, { worldId, locationId }: { worldId: string, locationId: string }) => {
        const { GetLocationEntitiesUseCase } = await import('../../application/usecases/entity/GetLocationEntitiesUseCase');
        const useCase = new GetLocationEntitiesUseCase(entityRepository);
        return useCase.execute({ worldId, locationId });
    });

    // エンティティ作成
    ipcMain.handle('entity:create', async (event, data: any) => {
        const { CreateEntityUseCase } = await import('../../application/usecases/entity/CreateEntityUseCase');
        const useCase = new CreateEntityUseCase(entityRepository);
        return useCase.execute(data);
    });

    // チャット履歴取得は ChatHandler に移動済み
    // ipcMain.handle('game:get-chat-history', ...) は削除
}

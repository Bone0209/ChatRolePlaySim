/**
 * ProcessActionUseCase - アクション処理ユースケース
 * 
 * プレイヤーのアクション（会話、行動、スキップ）に応じて時間を進めます。
 */

import type { IEntityRepository } from '../../../domain/repositories';
import { GameStateDto } from '../../dtos';
import { GetGameStateUseCase } from './GetGameStateUseCase';

/** 1日あたりのステップ数 */
const STEPS_PER_DAY = 100000;

/** アクションの種類 */
export type ActionMode = 'TALK' | 'ACTION' | 'SKIP';

/**
 * アクション処理ユースケース
 */
export class ProcessActionUseCase {
    constructor(
        private readonly entityRepository: IEntityRepository,
        private readonly getSteps: (worldId: string) => Promise<number>,
        private readonly setSteps: (worldId: string, steps: number) => Promise<void>
    ) { }

    /**
     * アクションを処理
     * @param worldId ワールドID
     * @param mode アクションモード
     * @returns 更新後のゲーム状態
     */
    async execute(worldId: string, mode: ActionMode): Promise<GameStateDto> {
        // 現在のステップ数を取得
        const currentSteps = await this.getSteps(worldId);

        // アクションに応じたコストを計算
        const cost = this.calculateCost(mode, currentSteps);
        const newSteps = currentSteps + cost;

        // ステップ数を更新
        await this.setSteps(worldId, newSteps);

        // 更新後のゲーム状態を取得して返す
        const getStateUseCase = new GetGameStateUseCase(this.entityRepository, this.getSteps);
        return getStateUseCase.execute(worldId);
    }

    /**
     * アクションのコストを計算
     */
    private calculateCost(mode: ActionMode, currentSteps: number): number {
        switch (mode) {
            case 'TALK':
                return 1;
            case 'ACTION':
                return 3;
            case 'SKIP':
                // 次の日の開始まで進める
                const currentDay = Math.floor(currentSteps / STEPS_PER_DAY);
                const nextDayStart = (currentDay + 1) * STEPS_PER_DAY;
                return nextDayStart - currentSteps;
            default:
                return 0;
        }
    }
}

/**
 * GetGameStateUseCase - ゲーム状態取得ユースケース
 * 
 * 現在のゲーム状態（時間、場所、NPC一覧）を取得します。
 */

import type { IEntityRepository } from '../../../domain/repositories';
import { GameStateDto, NpcInfoDto, createDefaultGameState } from '../../dtos';

/** 1日あたりのステップ数 */
const STEPS_PER_DAY = 100000;

/**
 * ゲーム状態取得ユースケース
 */
export class GetGameStateUseCase {
    constructor(
        private readonly entityRepository: IEntityRepository,
        private readonly getSteps: (worldId: string) => Promise<number>
    ) { }

    /**
     * ゲーム状態を取得
     * @param worldId ワールドID
     * @returns ゲーム状態DTO
     */
    async execute(worldId: string): Promise<GameStateDto> {
        // ステップ数を取得
        const totalSteps = await this.getSteps(worldId);

        // 日数と時間帯を計算
        const day = Math.floor(totalSteps / STEPS_PER_DAY) + 1;
        const currentStep = totalSteps % STEPS_PER_DAY;
        const timeOfDay = this.calculateTimeOfDay(currentStep);

        // プレイヤーを取得して現在地を確認
        const player = await this.entityRepository.findPlayer(worldId);

        if (!player) {
            return {
                ...createDefaultGameState(),
                totalSteps,
                day,
                timeOfDay,
                currentStep
            };
        }

        const locationName = player.getLocation();
        const locationId = player.getLocationId();

        // 同じ場所のNPCを取得
        let npcs: NpcInfoDto[] = [];
        if (locationId) {
            const npcEntities = await this.entityRepository.findNpcsByLocation(locationId, worldId);
            npcs = npcEntities.map((npc: { id: string; name: string; getParameterValue: (key: string) => unknown }) => ({
                id: npc.id,
                name: npc.name,
                role: (npc.getParameterValue('role') as string) || 'NPC'
            }));
        }

        return {
            totalSteps,
            day,
            timeOfDay,
            currentStep,
            locationName,
            locationId,
            npcs
        };
    }

    /**
     * ステップ数から時間帯を計算
     */
    private calculateTimeOfDay(currentStep: number): string {
        if (currentStep < 20000) return 'Early Morning';
        if (currentStep < 50000) return 'Morning';
        if (currentStep < 75000) return 'Afternoon';
        return 'Evening';
    }
}

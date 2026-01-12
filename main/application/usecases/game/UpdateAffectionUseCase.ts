/**
 * UpdateAffectionUseCase - 好感度更新ユースケース
 * 
 * NPCの好感度を更新し、履歴を記録します。
 */

import type { IEntityRepository } from '../../../domain/repositories';
import { ParameterValue, Visibility } from '../../../domain/value-objects';

/** 好感度更新の入力 */
export interface UpdateAffectionInput {
    entityId: string;
    delta: number;
    reason?: string;
}

/** 好感度更新の結果 */
export interface UpdateAffectionResult {
    previousValue: number;
    newValue: number;
    entityId: string;
}

/**
 * 好感度更新ユースケース
 */
export class UpdateAffectionUseCase {
    constructor(
        private readonly entityRepository: IEntityRepository
    ) { }

    /**
     * 好感度を更新
     * @param input 更新情報
     * @returns 更新結果
     */
    async execute(input: UpdateAffectionInput): Promise<UpdateAffectionResult> {
        // エンティティを取得
        const entity = await this.entityRepository.findById(input.entityId);

        if (!entity) {
            throw new Error(`Entity not found: ${input.entityId}`);
        }

        // 現在の好感度を取得
        const currentAffection = entity.getAffection();
        const newAffection = currentAffection + input.delta;

        // 好感度を更新（履歴も自動記録）
        const newValue = ParameterValue.create(newAffection, Visibility.private());
        await this.entityRepository.updateParameter(
            input.entityId,
            'state',
            'affection',
            newValue
        );

        console.log(`[UpdateAffection] ${input.entityId}: ${currentAffection} -> ${newAffection} (${input.reason || 'No reason'})`);

        return {
            previousValue: currentAffection,
            newValue: newAffection,
            entityId: input.entityId
        };
    }
}

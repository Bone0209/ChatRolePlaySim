/**
 * CreateWorldUseCase - ワールド作成ユースケース
 */

import type { IWorldRepository, IEntityRepository } from '../../../domain/repositories';
import { World, GameEntity } from '../../../domain/entities';
import type { EntityType, ParameterMap } from '../../../domain/entities';
import { ParameterValue } from '../../../domain/value-objects';
import { WorldDto, CreateWorldRequestDto } from '../../dtos';

/**
 * ワールド作成ユースケース
 */
export class CreateWorldUseCase {
    constructor(
        private readonly worldRepository: IWorldRepository,
        private readonly entityRepository: IEntityRepository
    ) { }

    /**
     * ワールドを作成
     * @param request 作成リクエスト
     * @returns 作成されたワールドDTO
     */
    async execute(request: CreateWorldRequestDto): Promise<WorldDto> {
        // ワールドエンティティを作成
        const world = World.create({
            id: request.id,
            name: request.name,
            prompt: request.prompt
        });

        // ワールドを保存
        const savedWorld = await this.worldRepository.save(world);

        // エンティティを作成
        for (const entityData of request.entities) {
            const { persona, parameter, state } = this.splitEnvironment(entityData.environment);

            const entity = GameEntity.create({
                id: entityData.id,
                worldId: world.id,
                type: entityData.type as EntityType,
                name: entityData.name,
                description: entityData.description,
                persona,
                parameter,
                state
            });

            await this.entityRepository.save(entity);
        }

        return this.toDto(savedWorld);
    }

    /**
     * 環境データをカテゴリ別に分割
     */
    private splitEnvironment(env: Record<string, any>): {
        persona: ParameterMap;
        parameter: ParameterMap;
        state: ParameterMap;
    } {
        const personaKeys = ['personality', 'role', 'tone', 'firstPerson', 'sentenceEnding', 'name', 'description', 'race', 'gender', 'ageGroup', 'appearance', 'background'];
        const stateKeys = ['location', 'locationId', 'locationName', 'condition', 'affection', 'mood', 'weather'];

        const persona: ParameterMap = new Map();
        const parameter: ParameterMap = new Map();
        const state: ParameterMap = new Map();

        for (const [key, rawValue] of Object.entries(env)) {
            // 値をParameterValueに変換
            let paramValue: ParameterValue<unknown>;

            if (rawValue && typeof rawValue === 'object' && 'val' in rawValue) {
                // 新形式: { val, vis }
                paramValue = ParameterValue.fromJson(rawValue);
            } else {
                // レガシー形式
                paramValue = ParameterValue.fromPlainValue(rawValue);
            }

            // カテゴリに振り分け
            if (stateKeys.includes(key) || stateKeys.some(k => key.startsWith(k))) {
                state.set(key, paramValue);
            } else if (personaKeys.includes(key) || personaKeys.some(k => key.startsWith(k))) {
                persona.set(key, paramValue);
            } else {
                // デフォルトはパラメータ
                parameter.set(key, paramValue);
            }
        }

        return { persona, parameter, state };
    }

    /**
     * ドメインエンティティからDTOへ変換
     */
    private toDto(world: World): WorldDto {
        return {
            id: world.id,
            name: world.name,
            prompt: world.prompt,
            createdAt: world.createdAt.toISOString()
        };
    }
}

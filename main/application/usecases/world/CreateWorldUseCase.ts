/**
 * CreateWorldUseCase - ワールド作成ユースケース
 */

import type { IWorldRepository, IEntityRepository, ILocationRepository } from '../../../domain/repositories';
import { World, GameEntity, Location } from '../../../domain/entities';
import type { EntityType, ParameterMap } from '../../../domain/entities';
import { ParameterValue, Visibility } from '../../../domain/value-objects';
import { WorldDto, CreateWorldRequestDto, WorldEntityConfig } from '../../dtos';

import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { LlmGateway } from '../../../infrastructure/gateways/LlmGateway';
import { PromptTemplate } from '../../../infrastructure/prompts';

/**
 * ワールド作成ユースケース
 */
export class CreateWorldUseCase {
    constructor(
        private readonly worldRepository: IWorldRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly entityRepository: IEntityRepository,
        private readonly llmGateway: LlmGateway,
        private readonly promptsPath: string
    ) { }

    /**
     * ワールドを作成
     * @param request 作成リクエスト
     * @returns 作成されたワールドDTO
     */
    async execute(request: CreateWorldRequestDto): Promise<WorldDto> {
        const worldId = request.id || uuidv4();

        // ワールドエンティティを作成
        const world = World.create({
            id: worldId,
            name: request.name,
            prompt: request.prompt
        });

        // ワールドを保存
        const savedWorld = await this.worldRepository.save(world);

        let entitiesData = request.entities;

        // エンティティが空の場合、自動生成を実行
        if (!entitiesData || entitiesData.length === 0) {
            console.log('[CreateWorldUseCase] No entities provided. Auto-generating NPC and Location...');

            let attempts = 0;
            const maxAttempts = 3;
            let success = false;

            while (attempts < maxAttempts && !success) {
                attempts++;
                try {
                    console.log(`[CreateWorldUseCase] Generation attempt ${attempts}/${maxAttempts}`);

                    // プロンプト読み込み
                    const templatePath = path.join(this.promptsPath, 'world_gen_npc.md');
                    const template = new PromptTemplate(templatePath);

                    // プロンプトレンダリング
                    const promptText = template.render({
                        context: request.name + "\n" + request.prompt,
                        flavor: "Fantasy RPG"
                    });

                    // LLM呼び出し
                    const generatedData = await this.llmGateway.generateJson(promptText, "Generate NPC and Location in JSON format.", {
                        model: 'main',
                        metadata: {
                            apiType: 'world_gen_npc',
                            worldId: world.id
                        }
                    });

                    // データ整形
                    if (generatedData && generatedData.npc && generatedData.npc.environment) {
                        const locationName = generatedData.location?.name || 'Unknown Location';
                        const locationDescription = generatedData.location?.description || '';
                        const locationId = uuidv4();

                        // Locationエンティティの作成・保存
                        const location = Location.create({
                            id: locationId,
                            worldId: world.id,
                            name: locationName,
                            description: locationDescription,
                            attributes: new Map() // 必要なら生成データから設定
                        });
                        await this.locationRepository.save(location);

                        // NPCデータ構築
                        const npcId = uuidv4();
                        const npcEnv = generatedData.npc.environment;

                        // location情報をNPCのstateに追加
                        npcEnv['location'] = { val: locationName, category: 'state', vis: 'vis_public' };
                        npcEnv['locationId'] = { val: locationId, category: 'state', vis: 'vis_private' };

                        // プレイヤーデータ構築
                        const playerId = uuidv4();
                        const playerEnv: any = {
                            name: { val: 'あなた', category: 'basic', vis: 'vis_public' },
                            location: { val: locationName, category: 'state', vis: 'vis_public' },
                            locationId: { val: locationId, category: 'state', vis: 'vis_private' },
                            // 最低限のステータス
                            currentHp: { val: 100, category: 'state', vis: 'vis_public' },
                            maxHp: { val: 100, category: 'parameter', vis: 'vis_private' }
                        };

                        // リクエスト配列を構築
                        entitiesData = [
                            {
                                id: npcId,
                                type: 'ENTITY_NPC',
                                name: npcEnv.name?.val || 'NPC',
                                description: npcEnv.appearance?.val || '',
                                environment: npcEnv
                            },
                            {
                                id: playerId,
                                type: 'ENTITY_PLAYER',
                                name: 'あなた',
                                description: 'プレイヤー',
                                environment: playerEnv
                            }
                        ];
                        success = true;
                    } else {
                        throw new Error("Invalid generated data structure");
                    }

                } catch (e) {
                    console.warn(`[CreateWorldUseCase] Auto-generation attempt ${attempts} failed:`, e);
                    if (attempts >= maxAttempts) {
                        console.error('[CreateWorldUseCase] All auto-generation attempts failed.');
                        throw new Error("Failed to generate world characters after multiple attempts. Please try again.");
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        // エンティティを作成・保存
        if (entitiesData) {
            for (const entityData of entitiesData) {
                const { persona, parameter, state } = this.splitEnvironment(entityData.environment);

                const entity = GameEntity.create({
                    id: entityData.id || uuidv4(),
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

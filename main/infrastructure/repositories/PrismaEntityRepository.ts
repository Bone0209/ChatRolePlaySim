/**
 * PrismaEntityRepository - GameEntityリポジトリの実装
 * 
 * Prismaを使用してGameEntityの永続化を行います。
 * M/T/Hテーブル構造に対応し、履歴管理も行います。
 */

import { IEntityRepository, ParameterCategory } from '../../domain/repositories';
import { GameEntity, EntityType, ParameterMap } from '../../domain/entities';
import { ParameterValue, Visibility } from '../../domain/value-objects';
import prisma from '../database/prisma';

/**
 * Prismaを使用したEntityリポジトリ実装
 */
export class PrismaEntityRepository implements IEntityRepository {

    /**
     * IDでエンティティを検索
     */
    async findById(id: string): Promise<GameEntity | null> {
        if (!prisma) throw new Error('Database not initialized');

        const record = await (prisma as any).mEntity.findUnique({
            where: { id },
            include: {
                currentState: true,
                currentPersona: true,
                currentParameter: true
            }
        });

        if (!record) return null;
        return this.toDomain(record);
    }

    /**
     * ワールドIDでエンティティを検索
     */
    async findByWorldId(worldId: string): Promise<GameEntity[]> {
        if (!prisma) throw new Error('Database not initialized');

        const records = await (prisma as any).mEntity.findMany({
            where: { worldId },
            include: {
                currentState: true,
                currentPersona: true,
                currentParameter: true
            }
        });

        return records.map((r: any) => this.toDomain(r));
    }

    /**
     * 種類でエンティティを検索
     */
    async findByType(type: EntityType, worldId?: string): Promise<GameEntity[]> {
        if (!prisma) throw new Error('Database not initialized');

        const where: any = { type };
        if (worldId) where.worldId = worldId;

        const records = await (prisma as any).mEntity.findMany({
            where,
            include: {
                currentState: true,
                currentPersona: true,
                currentParameter: true
            }
        });

        return records.map((r: any) => this.toDomain(r));
    }

    /**
     * プレイヤーエンティティを取得
     */
    async findPlayer(worldId: string): Promise<GameEntity | null> {
        if (!prisma) throw new Error('Database not initialized');

        const record = await (prisma as any).mEntity.findFirst({
            where: { type: 'ENTITY_PLAYER', worldId },
            include: {
                currentState: true,
                currentPersona: true,
                currentParameter: true
            }
        });

        if (!record) return null;
        return this.toDomain(record);
    }

    /**
     * 同じ場所にいるNPCを検索
     */
    async findNpcsByLocation(locationId: string, worldId: string): Promise<GameEntity[]> {
        if (!prisma) throw new Error('Database not initialized');

        // すべてのNPCを取得してからフィルタリング（JSONフィールド内の検索のため）
        const allNpcs = await this.findByType('ENTITY_NPC', worldId);

        return allNpcs.filter(npc => npc.getLocationId() === locationId);
    }

    /**
     * エンティティを保存
     */
    async save(entity: GameEntity): Promise<GameEntity> {
        if (!prisma) throw new Error('Database not initialized');

        const personaData = this.parameterMapToJson(entity.persona);
        const parameterData = this.parameterMapToJson(entity.parameter);
        const stateData = this.parameterMapToJson(entity.state);

        const existing = await (prisma as any).mEntity.findUnique({
            where: { id: entity.id }
        });

        if (existing) {
            // 更新（各カテゴリのT_テーブルを更新）
            await (prisma as any).$transaction([
                (prisma as any).mEntity.update({
                    where: { id: entity.id },
                    data: {
                        name: entity.name,
                        description: entity.description
                    }
                }),
                (prisma as any).tEntityPersona.upsert({
                    where: { entityId: entity.id },
                    update: { data: personaData },
                    create: { entityId: entity.id, data: personaData }
                }),
                (prisma as any).tEntityParameter.upsert({
                    where: { entityId: entity.id },
                    update: { data: parameterData },
                    create: { entityId: entity.id, data: parameterData }
                }),
                (prisma as any).tEntityState.upsert({
                    where: { entityId: entity.id },
                    update: { data: stateData },
                    create: { entityId: entity.id, data: stateData }
                })
            ]);
        } else {
            // 新規作成（M_とT_の両方を作成）
            await (prisma as any).mEntity.create({
                data: {
                    id: entity.id,
                    worldId: entity.worldId,
                    type: entity.type,
                    name: entity.name,
                    description: entity.description,
                    initialPersona: { create: { data: personaData } },
                    currentPersona: { create: { data: personaData } },
                    initialParameter: { create: { data: parameterData } },
                    currentParameter: { create: { data: parameterData } },
                    initialState: { create: { data: stateData } },
                    currentState: { create: { data: stateData } }
                }
            });
        }

        // 保存後のエンティティを再取得して返す
        return (await this.findById(entity.id))!;
    }

    /**
     * エンティティの特定パラメータを更新し、履歴を記録
     */
    async updateParameter(
        entityId: string,
        category: ParameterCategory,
        key: string,
        value: ParameterValue<unknown>
    ): Promise<void> {
        if (!prisma) throw new Error('Database not initialized');

        // カテゴリに応じたテーブルを選択
        const tableMap = {
            state: { current: 'tEntityState', history: 'hEntityState' },
            persona: { current: 'tEntityPersona', history: 'hEntityPersona' },
            parameter: { current: 'tEntityParameter', history: 'hEntityParameter' }
        };

        const tables = tableMap[category];
        if (!tables) throw new Error(`Invalid category: ${category}`);

        // 現在のデータを取得
        const currentRecord = await (prisma as any)[tables.current].findUnique({
            where: { entityId }
        });

        if (!currentRecord) {
            throw new Error(`Current record not found for entity ${entityId} in category ${category}`);
        }

        const currentData = (currentRecord.data as Record<string, any>) || {};
        const oldValue = currentData[key];
        const newValueJson = value.toJson();

        // 差分を計算
        const diff: any = {};
        if (oldValue === undefined) {
            diff.add = { [key]: newValueJson };
        } else {
            diff.upd = { [key]: newValueJson };
        }

        // 新しいデータを作成
        const newData = { ...currentData, [key]: newValueJson };

        // トランザクションで更新と履歴記録を実行
        await (prisma as any).$transaction([
            (prisma as any)[tables.current].update({
                where: { entityId },
                data: { data: newData }
            }),
            (prisma as any)[tables.history].create({
                data: {
                    entityId,
                    diff
                }
            })
        ]);

        console.log(`[EntityRepository] Updated ${category}.${key} for ${entityId}. Logged to History.`);
    }

    /**
     * エンティティを削除
     */
    async delete(id: string): Promise<void> {
        if (!prisma) throw new Error('Database not initialized');

        await (prisma as any).mEntity.delete({
            where: { id }
        });
    }

    // --- Private Helper Methods ---

    /**
     * Prismaモデルからドメインエンティティへ変換
     */
    private toDomain(record: any): GameEntity {
        const persona = this.jsonToParameterMap(record.currentPersona?.data || {});
        const parameter = this.jsonToParameterMap(record.currentParameter?.data || {});
        const state = this.jsonToParameterMap(record.currentState?.data || {});

        return GameEntity.reconstruct({
            id: record.id,
            worldId: record.worldId,
            type: record.type as EntityType,
            name: record.name,
            description: record.description || '',
            createdAt: record.createdAt,
            persona,
            parameter,
            state
        });
    }

    /**
     * JSONオブジェクトからParameterMapへ変換
     */
    private jsonToParameterMap(data: Record<string, any>): ParameterMap {
        const map: ParameterMap = new Map();

        for (const [key, value] of Object.entries(data)) {
            if (value && typeof value === 'object' && 'val' in value) {
                // 新しい形式: { val, vis }
                map.set(key, ParameterValue.fromJson(value));
            } else {
                // レガシー形式: 直接の値
                map.set(key, ParameterValue.fromPlainValue(value));
            }
        }

        return map;
    }

    /**
     * ParameterMapからJSONオブジェクトへ変換
     */
    private parameterMapToJson(map: ParameterMap): Record<string, any> {
        const result: Record<string, any> = {};
        map.forEach((value, key) => {
            result[key] = value.toJson();
        });
        return result;
    }
}

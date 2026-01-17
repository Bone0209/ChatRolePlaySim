/**
 * PrismaEntityRepository - GameEntityリポジトリの実装
 * 
 * Prismaを使用してGameEntityの永続化を行います。
 * M/T/Hテーブル構造に対応し、履歴管理も行います。
 * キー・バリュー形式の属性管理とViewを使用したデータ復元を行います。
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

        // 1. 基本情報を取得
        const mEntity = await (prisma as any).mEntity.findUnique({
            where: { id }
        });

        if (!mEntity) return null;

        // 2. 属性詳細(View)から全属性を取得
        const attributes = await (prisma as any).vEntityAttributeDetail.findMany({
            where: { entityId: id }
        });

        // 3. ドメインエンティティに変換
        return this.reconstructEntity(mEntity, attributes);
    }

    /**
     * ワールドIDでエンティティを検索
     */
    async findByWorldId(worldId: string): Promise<GameEntity[]> {
        if (!prisma) throw new Error('Database not initialized');

        const mEntities = await (prisma as any).mEntity.findMany({
            where: { worldId }
        });

        const results: GameEntity[] = [];
        for (const mEntity of mEntities) {
            // N+1問題になるが、一旦シンプルに実装（必要ならViewを一括取得してメモリ結合）
            const attributes = await (prisma as any).vEntityAttributeDetail.findMany({
                where: { entityId: mEntity.id }
            });
            results.push(this.reconstructEntity(mEntity, attributes));
        }

        return results;
    }

    /**
     * 種類でエンティティを検索
     */
    async findByType(type: EntityType, worldId?: string): Promise<GameEntity[]> {
        if (!prisma) throw new Error('Database not initialized');

        const where: any = { type };
        if (worldId) where.worldId = worldId;

        const mEntities = await (prisma as any).mEntity.findMany({ where });

        const results: GameEntity[] = [];
        for (const mEntity of mEntities) {
            const attributes = await (prisma as any).vEntityAttributeDetail.findMany({
                where: { entityId: mEntity.id }
            });
            results.push(this.reconstructEntity(mEntity, attributes));
        }

        return results;
    }

    /**
     * プレイヤーエンティティを取得
     */
    async findPlayer(worldId: string): Promise<GameEntity | null> {
        if (!prisma) throw new Error('Database not initialized');

        const mEntity = await (prisma as any).mEntity.findFirst({
            where: { type: 'ENTITY_PLAYER', worldId }
        });

        if (!mEntity) return null;

        const attributes = await (prisma as any).vEntityAttributeDetail.findMany({
            where: { entityId: mEntity.id }
        });

        return this.reconstructEntity(mEntity, attributes);
    }

    /**
     * 同じ場所にいるNPCを検索
     */
    async findNpcsByLocation(locationId: string, worldId: string): Promise<GameEntity[]> {
        if (!prisma) throw new Error('Database not initialized');

        // Note: Viewを使ってSQLレベルでフィルタリングすることも可能だが、
        // locationIdは "state" カテゴリの "locationId" キーとして格納されている。
        // ここでは既存のfindByTypeを再利用してメモリフィルタリングする（安全策）。
        const allNpcs = await this.findByType('ENTITY_NPC', worldId);
        return allNpcs.filter(npc => npc.getLocationId() === locationId);
    }

    /**
     * エンティティを保存
     */
    async save(entity: GameEntity): Promise<GameEntity> {
        if (!prisma) throw new Error('Database not initialized');

        const existing = await (prisma as any).mEntity.findUnique({
            where: { id: entity.id }
        });

        // 1. MEntityの更新/作成
        if (existing) {
            await (prisma as any).mEntity.update({
                where: { id: entity.id },
                data: {
                    name: entity.name,
                    description: entity.description
                }
            });
        } else {
            await (prisma as any).mEntity.create({
                data: {
                    id: entity.id,
                    worldId: entity.worldId,
                    type: entity.type,
                    name: entity.name,
                    description: entity.description
                }
            });
        }

        // 2. 属性の更新（T更新 + H作成）
        // ドメインエンティティの持つ全属性をフラットに取得
        const allParams = entity.getAllParameters(); // { val, vis, category }

        // トランザクションで一括処理
        await (prisma as any).$transaction(async (tx: any) => {
            for (const [key, param] of Object.entries(allParams)) {

                // 値の文字列化
                const newValueStr = this.valueToString(param.val);

                // Definitionの存在保証 (Dynamic Attribute Support)
                const valueType = typeof param.val === 'number' ? 'number' : typeof param.val === 'boolean' ? 'boolean' : 'string';
                await tx.mAttributeDefinition.upsert({
                    where: { keyName: key },
                    update: {},
                    create: {
                        keyName: key,
                        valueType: valueType,
                        category: param.category || 'parameter', // Default fallback
                        description: `Auto-generated ${key}`
                    }
                });

                // 現在の値を取得
                const currentAttr = await tx.tEntityAttribute.findUnique({
                    where: { entityId_keyName: { entityId: entity.id, keyName: key } }
                });

                if (currentAttr) {
                    // 変更がある場合のみ更新
                    if (currentAttr.keyValue !== newValueStr) {
                        // T更新
                        await tx.tEntityAttribute.update({
                            where: { id: currentAttr.id },
                            data: { keyValue: newValueStr }
                        });

                        // H作成
                        await tx.hEntityAttribute.create({
                            data: {
                                entityId: entity.id,
                                keyName: key,
                                oldValue: currentAttr.keyValue,
                                newValue: newValueStr,
                                changeType: 'update'
                            }
                        });
                    }
                } else {
                    // 新規作成
                    try {
                        // console.log(`[Repo] Saving attribute: ${key} = ${newValueStr}`);
                        await tx.tEntityAttribute.create({
                            data: {
                                entityId: entity.id,
                                keyName: key,
                                keyValue: newValueStr
                            }
                        });
                    } catch (e) {
                        console.error(`[Repo] Failed to save attribute ${key}:`, e);
                        throw e;
                    }

                    // H作成
                    await tx.hEntityAttribute.create({
                        data: {
                            entityId: entity.id,
                            keyName: key,
                            oldValue: null,
                            newValue: newValueStr,
                            changeType: 'create'
                        }
                    });
                }
            }
        });

        // 保存後の状態を再取得して返す
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

        await (prisma as any).$transaction(async (tx: any) => {
            const newValueStr = this.valueToString(value.value);

            // Definitionの存在保証
            const valueType = typeof value.value === 'number' ? 'number' : typeof value.value === 'boolean' ? 'boolean' : 'string';
            await tx.mAttributeDefinition.upsert({
                where: { keyName: key },
                update: {},
                create: {
                    keyName: key,
                    valueType: valueType,
                    category: category,
                    description: `Auto-generated ${key}`
                }
            });

            const currentAttr = await tx.tEntityAttribute.findUnique({
                where: { entityId_keyName: { entityId, keyName: key } }
            });

            if (currentAttr) {
                if (currentAttr.keyValue !== newValueStr) {
                    await tx.tEntityAttribute.update({
                        where: { id: currentAttr.id },
                        data: { keyValue: newValueStr }
                    });
                    await tx.hEntityAttribute.create({
                        data: {
                            entityId,
                            keyName: key,
                            oldValue: currentAttr.keyValue,
                            newValue: newValueStr,
                            changeType: 'update'
                        }
                    });
                }
            } else {
                await tx.tEntityAttribute.create({
                    data: { entityId, keyName: key, keyValue: newValueStr }
                });
                await tx.hEntityAttribute.create({
                    data: {
                        entityId,
                        keyName: key,
                        oldValue: null,
                        newValue: newValueStr,
                        changeType: 'create'
                    }
                });
            }
        });
    }

    /**
     * エンティティを削除
     */
    async delete(id: string): Promise<void> {
        if (!prisma) throw new Error('Database not initialized');

        // Cascade delete設定により関連テーブルも削除される想定
        await (prisma as any).mEntity.delete({
            where: { id }
        });
    }

    // --- Helper Methods ---

    private reconstructEntity(mEntity: any, attributes: any[]): GameEntity {
        const persona = new Map();
        const parameter = new Map();
        const state = new Map();

        for (const attr of attributes) {
            // 値の型変換
            const value = this.stringToValue(attr.keyValue, attr.valueType);

            // Visibilityオブジェクトの構築
            let visibility: Visibility;

            // Viewから取得したメタデータを使用
            if (attr.visibility === 'public') {
                visibility = Visibility.public();
            } else if (attr.visibility === 'private') {
                visibility = Visibility.private();
            } else {
                visibility = Visibility.fromString(attr.visibility);
                // パラメータ付きVisibilityの場合などは別途対応が必要だが、
                // 現状のドメインオブジェクトにあわせて実装。
            }

            const paramValue = ParameterValue.create(value, visibility);

            // カテゴリ振り分け
            if (attr.category === 'persona') {
                persona.set(attr.keyName, paramValue);
            } else if (attr.category === 'state') {
                state.set(attr.keyName, paramValue);
            } else {
                parameter.set(attr.keyName, paramValue);
            }
        }

        return GameEntity.reconstruct({
            id: mEntity.id,
            worldId: mEntity.worldId,
            type: mEntity.type as EntityType,
            name: mEntity.name,
            description: mEntity.description || '',
            createdAt: mEntity.createdAt,
            persona,
            parameter,
            state
        });
    }

    private valueToString(value: unknown): string {
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return String(value);
        if (value instanceof Date) return value.toISOString();
        if (value === null || value === undefined) return '';
        return JSON.stringify(value);
    }

    private stringToValue(str: string, type: string): unknown {
        switch (type) {
            case 'string': return str;
            case 'number':
            case 'integer':
            case 'float':
                return Number(str);
            case 'boolean': return str === 'true';
            case 'json': try { return JSON.parse(str); } catch { return str; }
            default: return str;
        }
    }
}

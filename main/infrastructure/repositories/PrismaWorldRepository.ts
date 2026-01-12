/**
 * PrismaWorldRepository - Worldリポジトリの実装
 * 
 * Prismaを使用してWorldエンティティの永続化を行います。
 */

import { IWorldRepository } from '../../domain/repositories';
import { World } from '../../domain/entities';
import prisma from '../database/prisma';

/**
 * Prismaを使用したWorldリポジトリ実装
 */
export class PrismaWorldRepository implements IWorldRepository {

    /**
     * IDでワールドを検索
     */
    async findById(id: string): Promise<World | null> {
        if (!prisma) {
            throw new Error('Database not initialized');
        }

        const record = await (prisma as any).mWorld.findUnique({
            where: { id }
        });

        if (!record) {
            return null;
        }

        return this.toDomain(record);
    }

    /**
     * すべてのワールドを取得
     */
    async findAll(): Promise<World[]> {
        if (!prisma) {
            throw new Error('Database not initialized');
        }

        const records = await (prisma as any).mWorld.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return records.map((record: any) => this.toDomain(record));
    }

    /**
     * ワールドを保存
     */
    async save(world: World): Promise<World> {
        if (!prisma) {
            throw new Error('Database not initialized');
        }

        const existing = await (prisma as any).mWorld.findUnique({
            where: { id: world.id }
        });

        if (existing) {
            // 更新
            const updated = await (prisma as any).mWorld.update({
                where: { id: world.id },
                data: {
                    name: world.name,
                    prompt: world.prompt
                }
            });
            return this.toDomain(updated);
        } else {
            // 新規作成
            const created = await (prisma as any).mWorld.create({
                data: {
                    id: world.id,
                    name: world.name,
                    prompt: world.prompt
                }
            });
            return this.toDomain(created);
        }
    }

    /**
     * ワールドを削除
     */
    async delete(id: string): Promise<void> {
        if (!prisma) {
            throw new Error('Database not initialized');
        }

        await (prisma as any).mWorld.delete({
            where: { id }
        });
    }

    // --- Private Helper Methods ---

    /**
     * Prismaモデルからドメインエンティティへ変換
     */
    private toDomain(record: any): World {
        return World.reconstruct({
            id: record.id,
            name: record.name,
            prompt: record.prompt,
            createdAt: record.createdAt
        });
    }
}

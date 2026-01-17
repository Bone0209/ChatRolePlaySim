/**
 * PrismaChatRepository - ChatMessageリポジトリの実装
 */

import { IChatRepository } from '../../domain/repositories';
import { ChatMessage, chatTypeToCode, chatTypeFromCode } from '../../domain/entities';
import prisma from '../database/prisma';

/**
 * Prismaを使用したChatリポジトリ実装
 */
export class PrismaChatRepository implements IChatRepository {

    /**
     * ワールドのチャット履歴を取得
     */
    async findByWorldId(worldId: string, limit: number = 50): Promise<ChatMessage[]> {
        if (!prisma) throw new Error('Database not initialized');

        const records = await (prisma as any).tChat.findMany({
            where: {
                worldId,
                isVisible: true
            },
            orderBy: { id: 'asc' },
            take: limit
        });

        return records.map((r: any) => this.toDomain(r));
    }

    /**
     * チャットメッセージを保存
     */
    async save(message: ChatMessage): Promise<ChatMessage> {
        if (!prisma) throw new Error('Database not initialized');

        const created = await (prisma as any).tChat.create({
            data: {
                worldId: message.worldId,
                chatType: chatTypeToCode(message.type),
                message: message.message,
                entityId: message.entityId,
                isVisible: message.isVisible
            }
        });

        return this.toDomain(created);
    }

    /**
     * ワールドのチャット履歴を削除
     */
    async deleteByWorldId(worldId: string): Promise<void> {
        if (!prisma) throw new Error('Database not initialized');

        await (prisma as any).tChat.deleteMany({
            where: { worldId }
        });
    }

    // --- Private Helper Methods ---

    /**
     * Prismaモデルからドメインエンティティへ変換
     */
    private toDomain(record: any): ChatMessage {
        return ChatMessage.reconstruct({
            id: record.id,
            worldId: record.worldId,
            type: chatTypeFromCode(record.chatType),
            message: record.message,
            entityId: record.entityId,
            createdAt: record.createdAt,
            isVisible: record.isVisible ?? true
        });
    }
}

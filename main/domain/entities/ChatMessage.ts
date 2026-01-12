/**
 * ChatMessage - チャットメッセージを表すドメインエンティティ
 */

/** チャットの種類 */
export type ChatType = 'CHAT_SYSTEM' | 'CHAT_PLAYER' | 'CHAT_NPC';

/** チャットタイプを文字列コードに変換 */
export function chatTypeToCode(type: ChatType): string {
    switch (type) {
        case 'CHAT_SYSTEM': return '0';
        case 'CHAT_PLAYER': return '1';
        case 'CHAT_NPC': return '2';
    }
}

/** 文字列コードからチャットタイプに変換 */
export function chatTypeFromCode(code: string): ChatType {
    switch (code) {
        case '1': return 'CHAT_PLAYER';
        case '2': return 'CHAT_NPC';
        default: return 'CHAT_SYSTEM';
    }
}

/**
 * チャットメッセージエンティティ
 */
export class ChatMessage {
    private readonly _id: number;
    private readonly _worldId: string;
    private readonly _type: ChatType;
    private readonly _message: string;
    private readonly _entityId: string | null;
    private readonly _createdAt: Date;

    private constructor(
        id: number,
        worldId: string,
        type: ChatType,
        message: string,
        entityId: string | null,
        createdAt: Date
    ) {
        this._id = id;
        this._worldId = worldId;
        this._type = type;
        this._message = message;
        this._entityId = entityId;
        this._createdAt = createdAt;
    }

    /**
     * 新しいチャットメッセージを作成（IDは後でDBが採番）
     */
    static create(params: {
        worldId: string;
        type: ChatType;
        message: string;
        entityId?: string;
    }): ChatMessage {
        return new ChatMessage(
            0, // IDは保存時に採番される
            params.worldId,
            params.type,
            params.message,
            params.entityId ?? null,
            new Date()
        );
    }

    /**
     * 既存のメッセージを復元
     */
    static reconstruct(params: {
        id: number;
        worldId: string;
        type: ChatType;
        message: string;
        entityId: string | null;
        createdAt: Date;
    }): ChatMessage {
        return new ChatMessage(
            params.id,
            params.worldId,
            params.type,
            params.message,
            params.entityId,
            params.createdAt
        );
    }

    // --- Getters ---

    get id(): number { return this._id; }
    get worldId(): string { return this._worldId; }
    get type(): ChatType { return this._type; }
    get message(): string { return this._message; }
    get entityId(): string | null { return this._entityId; }
    get createdAt(): Date { return this._createdAt; }

    // --- Business Methods ---

    /**
     * プレイヤーのメッセージかどうか
     */
    isFromPlayer(): boolean {
        return this._type === 'CHAT_PLAYER';
    }

    /**
     * NPCのメッセージかどうか
     */
    isFromNpc(): boolean {
        return this._type === 'CHAT_NPC';
    }

    /**
     * システムメッセージかどうか
     */
    isSystemMessage(): boolean {
        return this._type === 'CHAT_SYSTEM';
    }

    /**
     * LLMのコンテキスト用のロール文字列を取得
     */
    getLlmRole(): 'user' | 'assistant' | 'system' {
        switch (this._type) {
            case 'CHAT_PLAYER': return 'user';
            case 'CHAT_NPC': return 'assistant';
            default: return 'system';
        }
    }
}

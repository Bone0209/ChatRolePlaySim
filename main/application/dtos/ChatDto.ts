/**
 * ChatDto - チャット関連のDTO
 */

/** チャット送信リクエスト */
export interface SendMessageRequestDto {
    worldId: string;
    targetEntityId: string;
    message: string;
    history: ChatHistoryItemDto[];
}

/** チャット履歴アイテム */
export interface ChatHistoryItemDto {
    role: 'user' | 'assistant' | 'system';
    content: string;
    speakerName: string;
    entityId?: string;
}

/** チャット送信レスポンス */
export interface SendMessageResponseDto {
    reply: string;
    emotion?: string;
    entityId: string;
    entityName: string;
}

/** エンティティ詳細DTO */
export interface EntityDetailDto {
    id: string;
    name: string;
    type: string;
    description: string;
    environment: Record<string, { val: unknown; vis: string }>;
}

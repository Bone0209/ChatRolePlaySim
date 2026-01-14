# ChatMessage エンティティ仕様書

## 概要

チャットメッセージを表すドメインエンティティ。
プレイヤー・NPC・システムからのメッセージを管理する。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/entities/ChatMessage.ts` |
| **識別子** | id (number, 自動採番) |

---

## 型定義

```typescript
type ChatType = 'CHAT_SYSTEM' | 'CHAT_PLAYER' | 'CHAT_NPC';
```

---

## プロパティ

| プロパティ | 型 | 説明 |
|:-----------|:---|:-----|
| id | number | 一意識別子（自動採番） |
| worldId | string | ワールドID |
| type | ChatType | メッセージ種類 |
| message | string | メッセージ本文 |
| entityId | string \| null | 発言者エンティティID |
| createdAt | Date | 作成日時 |

---

## ファクトリメソッド

### ChatMessage.create(params)

新しいメッセージを作成（IDは保存時に採番）。

```typescript
ChatMessage.create({
    worldId: string;
    type: ChatType;
    message: string;
    entityId?: string;
}): ChatMessage
```

### ChatMessage.reconstruct(params)

DBから復元。

---

## ビジネスメソッド

### isFromPlayer(): boolean

プレイヤーのメッセージかどうか。

### isFromNpc(): boolean

NPCのメッセージかどうか。

### isSystemMessage(): boolean

システムメッセージかどうか。

### getLlmRole(): 'user' | 'assistant' | 'system'

LLMコンテキスト用のロール文字列を取得。

| ChatType | LLM Role |
|:---------|:---------|
| CHAT_PLAYER | user |
| CHAT_NPC | assistant |
| CHAT_SYSTEM | system |

---

## ヘルパー関数

### chatTypeToCode(type: ChatType): string

ChatTypeを数値コードに変換。

| ChatType | Code |
|:---------|:-----|
| CHAT_SYSTEM | '0' |
| CHAT_PLAYER | '1' |
| CHAT_NPC | '2' |

### chatTypeFromCode(code: string): ChatType

数値コードからChatTypeに変換。

---

## テーブルマッピング

| Prismaモデル | テーブル名 |
|:-------------|:-----------|
| TChat | t_chats |

---

## 関連ドキュメント

- [IChatRepository.md](../repositories/IChatRepository.md) - リポジトリ
- [SendMessageUseCase.md](../usecases/SendMessageUseCase.md) - メッセージ送信

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

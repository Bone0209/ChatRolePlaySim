# IChatRepository 仕様書

## 概要

チャットメッセージ（ChatMessage）の永続化を担当するリポジトリインターフェース。
会話履歴の取得・保存・削除を提供する。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/repositories/IChatRepository.ts` |
| **対象エンティティ** | ChatMessage |
| **実装クラス** | PrismaChatRepository |

---

## メソッド一覧

### findByWorldId(worldId: string, limit?: number): Promise<ChatMessage[]>

ワールドのチャット履歴を取得。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| worldId | string | ワールドID |
| limit | number | 取得する最大件数（デフォルト: 50） |

**戻り値**: ChatMessageの配列（ID昇順＝古い順）

---

### save(message: ChatMessage): Promise<ChatMessage>

チャットメッセージを保存。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| message | ChatMessage | 保存するメッセージ |

**戻り値**: IDが採番されたChatMessage

---

### deleteByWorldId(worldId: string): Promise<void>

ワールドのチャット履歴をすべて削除。

---

## テーブルマッピング

| Prismaモデル | テーブル名 |
|:-------------|:-----------|
| TChat | t_chats |

---

## 関連ドキュメント

- [ChatMessage.md](../entities/ChatMessage.md) - ChatMessageエンティティ
- [SendMessageUseCase.md](../usecases/SendMessageUseCase.md) - メッセージ送信

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

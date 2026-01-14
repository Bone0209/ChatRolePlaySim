# ChatHandler 仕様書

## 概要

チャット関連のIPCハンドラ。メッセージ送信と履歴取得を担当。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/interface-adapters/ipc/ChatHandler.ts` |
| **登録関数** | `registerChatHandler()` |

---

## IPCチャンネル

### chat

チャットメッセージを送信。

**パラメータ**:
```typescript
{
    message: string;       // メッセージ本文
    worldId: string;       // ワールドID
    targetId?: string;     // 対象NPC ID
    history?: Array<{ role: string; content: string }>;
}
```

**戻り値**:
```typescript
{ success: true; data: string }  // 成功時
{ success: false; error: string; message: string }  // 失敗時
```

**使用UseCase**: SendMessageUseCase

---

### game:get-chat-history

チャット履歴を取得。

**パラメータ**: `worldId: string`

**戻り値**:
```typescript
Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    speakerName: string;
    entityId: string | null;
}>
```

**処理内容**:
1. ChatRepositoryから履歴取得
2. アクティブプロファイルからプレイヤー名取得
3. エンティティIDからNPC名を解決
4. フロントエンド用形式に変換

---

## 依存関係

| 依存 | 説明 |
|:-----|:-----|
| SendMessageUseCase | チャット送信 |
| IChatRepository | 履歴取得 |
| IEntityRepository | NPC名解決 |
| PrismaUserProfileRepository | プレイヤー名取得 |

---

## エラーハンドリング

`chat` チャンネルでは、例外をスローせずエラーオブジェクトを返す。
これによりElectronのエラーダイアログを抑制し、フロントエンドで適切に処理可能。

---

## 関連ドキュメント

- [SendMessageUseCase.md](../usecases/SendMessageUseCase.md)

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

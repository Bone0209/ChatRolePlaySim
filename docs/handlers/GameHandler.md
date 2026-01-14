# GameHandler 仕様書

## 概要

ゲーム関連のIPCハンドラ。ゲーム状態取得、アクション処理、エンティティ詳細取得を担当。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/interface-adapters/ipc/GameHandler.ts` |
| **登録関数** | `registerGameHandler()` |

---

## IPCチャンネル

### game:get-state

ゲーム状態を取得。

**パラメータ**: `worldId: string`

**戻り値**: `GameStateDto`

**使用UseCase**: GetGameStateUseCase

---

### game:process-action

アクションを処理（時間経過）。

**パラメータ**:
```typescript
{
    mode: 'TALK' | 'ACTION' | 'SKIP';
    content: string;
    worldId: string;
}
```

**戻り値**: `GameStateDto`

**使用UseCase**: ProcessActionUseCase

---

### game:get-entity

エンティティ詳細を取得。

**パラメータ**: `entityId: string`

**戻り値**: `EntityDetailDto | null`

```typescript
interface EntityDetailDto {
    id: string;
    name: string;
    type: string;
    description: string;
    environment: Record<string, { val, vis, category }>;
}
```

---

## 依存関係

| 依存 | 説明 |
|:-----|:-----|
| IEntityRepository | エンティティ取得 |
| getSteps | ステップ数取得関数 |
| setSteps | ステップ数更新関数 |

---

## 関連ドキュメント

- [GetGameStateUseCase.md](../usecases/GetGameStateUseCase.md)
- [ProcessActionUseCase.md](../usecases/ProcessActionUseCase.md)

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

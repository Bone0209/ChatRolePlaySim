# WorldHandler 仕様書

## 概要

ワールド関連のIPCハンドラ。ワールドのCRUDとAI生成を担当。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/interface-adapters/ipc/WorldHandler.ts` |
| **登録関数** | `registerWorldHandler()` |

---

## IPCチャンネル

### world:list

ワールド一覧を取得。

**パラメータ**: なし

**戻り値**: `WorldDto[]`

**使用UseCase**: GetWorldsUseCase

---

### world:get

ワールドを取得（ID指定）。

**パラメータ**: `id: string`

**戻り値**: `WorldDto | null`

---

### world:create

ワールドを作成。

**パラメータ**: `CreateWorldRequestDto`

**戻り値**: `WorldDto`

**使用UseCase**: CreateWorldUseCase

---

### world:delete

ワールドを削除。

**パラメータ**: `id: string`

**戻り値**: `{ success: true }`

---

### world:generate

AI生成（タイトル、説明、NPC）。

**パラメータ**:
```typescript
{
    type: 'title' | 'description' | 'npc';
    context: string;
}
```

**戻り値**:
- `title`: クリーンアップされたタイトル文字列
- `description`: 説明文字列
- `npc`: NPCオブジェクト（JSON）

**処理内容**:
1. テンプレート選択（type別）
2. ランダムフレーバー付加
3. LLM呼び出し（title→sub, 他→main）
4. レスポンス整形

---

## プロンプトテンプレート

| type | テンプレート |
|:-----|:-------------|
| title | world_gen_title.md |
| description | world_gen_desc.md |
| npc | world_gen_npc.md |

---

## ランダムフレーバー

生成時に以下からランダム選択:
- 魔法と剣の世界
- スチームパンクの都市
- 神話と伝説の国
- 暗黒時代の王国
- 海賊と冒険の時代

---

## 関連ドキュメント

- [CreateWorldUseCase.md](../usecases/CreateWorldUseCase.md)
- [GetWorldsUseCase.md](../usecases/GetWorldsUseCase.md)

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

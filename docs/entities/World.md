# World エンティティ仕様書

## 概要

ゲームワールドを表すドメインエンティティ。
ワールドはゲームの舞台であり、複数のEntityとチャットを含む。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/entities/World.ts` |
| **識別子** | id (string, UUID) |

---

## プロパティ

| プロパティ | 型 | 説明 |
|:-----------|:---|:-----|
| id | string | 一意識別子（UUID） |
| name | string | ワールド名 |
| prompt | string | ワールド説明/設定 |
| createdAt | Date | 作成日時 |

---

## ファクトリメソッド

### World.create(params)

新しいワールドを作成。

```typescript
World.create({
    id: string;
    name: string;
    prompt: string;
    createdAt?: Date;  // 省略時は現在時刻
}): World
```

### World.reconstruct(params)

既存のワールドを復元（リポジトリから読み込む際に使用）。

```typescript
World.reconstruct({
    id: string;
    name: string;
    prompt: string;
    createdAt: Date;
}): World
```

---

## ビジネスメソッド

### getSummary(): string

表示用サマリーを取得。

**戻り値**: `"{name} (Created: {date})"`

---

## テーブルマッピング

| テーブル | 役割 |
|:---------|:-----|
| m_worlds | マスタデータ |

---

## 関連ドキュメント

- [IWorldRepository.md](../repositories/IWorldRepository.md) - リポジトリ
- [CreateWorldUseCase.md](../usecases/CreateWorldUseCase.md) - 作成ユースケース

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

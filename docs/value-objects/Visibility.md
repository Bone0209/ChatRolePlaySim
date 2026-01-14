# Visibility 値オブジェクト仕様書

## 概要

データの可視性（公開/非公開）を表す値オブジェクト。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/value-objects/Visibility.ts` |

---

## 型定義

```typescript
type VisibilityType = 'vis_public' | 'vis_private';
```

---

## ファクトリメソッド

### Visibility.public()

公開可視性を作成。

### Visibility.private()

非公開可視性を作成。

### Visibility.fromString(value: string)

文字列から可視性を作成。

| 入力値 | 結果 |
|:-------|:-----|
| `'vis_public'` | public |
| `true` | public |
| その他 | private |

---

## メソッド

### value: VisibilityType

可視性の値を取得。

### isPublic(): boolean

公開かどうか。

### isPrivate(): boolean

非公開かどうか。

### equals(other: Visibility): boolean

等価性比較。

### toString(): string

文字列表現。

---

## 使用例

```typescript
const pub = Visibility.public();
const priv = Visibility.private();

pub.isPublic();   // true
priv.isPrivate(); // true

const fromDb = Visibility.fromString('vis_public');
```

---

## プレイヤーへの表示

| Visibility | 表示 |
|:-----------|:-----|
| vis_public | ステータス画面に表示 |
| vis_private | 非表示（AI専用） |

---

## 関連ドキュメント

- [ParameterValue.md](./ParameterValue.md) - 使用元
- [NPC_Environment.md](../NPC_Environment.md) - visible フィールド

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

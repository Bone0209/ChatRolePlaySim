# ParameterValue 値オブジェクト仕様書

## 概要

パラメータの値と可視性を持つ値オブジェクト。
すべてのEntityのパラメータ（好感度、HP、性格など）はこの形式で管理される。
DBの `{ val, vis }` 構造に対応。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/value-objects/ParameterValue.ts` |
| **ジェネリック** | `ParameterValue<T>` |

---

## プロパティ

| プロパティ | 型 | 説明 |
|:-----------|:---|:-----|
| value | T | 実際の値 |
| visibility | Visibility | 可視性 |

---

## ファクトリメソッド

### ParameterValue.create<T>(value, visibility?)

新しいParameterValueを作成。

```typescript
ParameterValue.create(50, Visibility.private())
```

### ParameterValue.fromJson<T>(data)

DB JSON形式から作成。

```typescript
ParameterValue.fromJson({ val: 50, vis: 'vis_private' })
```

### ParameterValue.fromPlainValue<T>(value)

レガシーデータ対応。可視性なしの場合は非公開として扱う。

---

## メソッド

### isPublic(): boolean

公開されているかどうか。

### withValue(newValue: T): ParameterValue<T>

新しい値で更新した新インスタンスを作成。

### withVisibility(newVisibility): ParameterValue<T>

新しい可視性で更新した新インスタンスを作成。

### toJson(): { val: T; vis: VisibilityType }

DB保存用JSON形式に変換。

### equals(other): boolean

等価性比較。

---

## 使用例

```typescript
// 作成
const affection = ParameterValue.create(50, Visibility.private());

// 更新（不変性維持）
const newAffection = affection.withValue(60);

// DB保存
const json = newAffection.toJson(); 
// => { val: 60, vis: 'vis_private' }
```

---

## 関連ドキュメント

- [Visibility.md](./Visibility.md) - 可視性
- [GameEntity.md](../entities/GameEntity.md) - 使用元

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

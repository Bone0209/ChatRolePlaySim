# IWorldRepository 仕様書

## 概要

ワールド（World）エンティティの永続化を担当するリポジトリインターフェース。
ドメイン層で定義され、インフラ層で実装される。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/domain/repositories/IWorldRepository.ts` |
| **対象エンティティ** | World |
| **実装クラス** | PrismaWorldRepository |

---

## メソッド一覧

### findById(id: string): Promise<World | null>

IDでワールドを検索する。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| id | string | ワールドID |

**戻り値**: 該当するWorld、存在しない場合は `null`

---

### findAll(): Promise<World[]>

すべてのワールドを取得する。

**戻り値**: Worldの配列（作成日時の降順）

---

### save(world: World): Promise<World>

ワールドを保存する（新規作成または更新）。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| world | World | 保存するワールド |

**戻り値**: 保存されたWorld

**動作**:
- IDが存在する場合: UPDATE
- IDが存在しない場合: INSERT

---

### delete(id: string): Promise<void>

ワールドを削除する。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| id | string | 削除するワールドのID |

> [!NOTE]
> CASCADE設定により、関連するEntity・Chat・ApiLogも削除される。

---

## テーブルマッピング

| Prismaモデル | テーブル名 |
|:-------------|:-----------|
| MWorld | m_worlds |

---

## 関連ドキュメント

- [World.md](../entities/World.md) - Worldエンティティ
- [CreateWorldUseCase.md](../usecases/CreateWorldUseCase.md) - ワールド作成

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

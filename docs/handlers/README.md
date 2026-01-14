# IPCハンドラ仕様書インデックス

IPCハンドラはElectronのIPCイベントを受け取り、UseCaseに委譲するインターフェースアダプター層のコンポーネントです。

---

## ハンドラ一覧

| ハンドラ | 説明 |
|:---------|:-----|
| [ChatHandler](./ChatHandler.md) | チャット送信・履歴取得 |
| [GameHandler](./GameHandler.md) | ゲーム状態・アクション処理 |
| [WorldHandler](./WorldHandler.md) | ワールドCRUD・AI生成 |
| [UserProfileHandler](./UserProfileHandler.md) | プロファイル・設定管理 |

---

## 設計原則

1. **ビジネスロジックなし**: 入出力の変換のみを担当
2. **UseCase委譲**: すべての処理はUseCaseに委譲
3. **エラーハンドリング**: Electronエラーダイアログ抑制のためオブジェクトで返却
4. **DIパターン**: リポジトリとUseCaseは外部から注入

---

## ディレクトリ構造

```
main/interface-adapters/ipc/
├── ChatHandler.ts
├── GameHandler.ts
├── WorldHandler.ts
├── UserProfileHandler.ts
└── index.ts
```

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

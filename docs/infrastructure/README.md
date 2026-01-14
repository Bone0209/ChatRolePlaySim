# インフラストラクチャ層 仕様書インデックス

インフラ層はデータベース接続、外部API、設定管理など技術的関心事を担当します。

---

## コンポーネント一覧

| カテゴリ | 説明 |
|:---------|:-----|
| [config](./Config.md) | アプリケーション設定管理 |
| [database](./Database.md) | Prismaクライアント |
| [security](./Security.md) | 暗号化サービス |
| [prompts](./Prompts.md) | プロンプトテンプレート |
| [gateways](../gateways/README.md) | 外部API（LLM） |
| [repositories](../repositories/README.md) | リポジトリ実装 |

---

## ディレクトリ構造

```
main/infrastructure/
├── config/          # 設定管理
│   └── config.ts
├── database/        # DB接続
│   └── prisma.ts
├── gateways/        # 外部API
│   └── LlmGateway.ts
├── logging/         # ロギング
├── prompts/         # プロンプト
│   └── PromptTemplate.ts
├── repositories/    # リポジトリ実装
├── security/        # セキュリティ
│   └── EncryptionService.ts
└── utils/           # ユーティリティ
```

---

## 設計原則

1. **ドメイン層からの独立**: ドメイン層はインフラ層に依存しない
2. **インターフェース実装**: ドメイン層のインターフェースを実装
3. **設定の注入**: 環境変数やDBから設定を読み込み
4. **隠蔽**: 外部技術の詳細を隠蔽

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

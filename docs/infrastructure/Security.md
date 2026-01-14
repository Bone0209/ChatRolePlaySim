# Security (EncryptionService) 仕様書

## 概要

機密データ（APIキー等）の暗号化・復号を担当するサービス。
ElectronのsafeStorage APIを使用してOS標準の暗号化機能を活用。

---

## 基本情報

| 項目 | 内容 |
|:-----|:-----|
| **ファイルパス** | `main/infrastructure/security/EncryptionService.ts` |
| **使用API** | `electron.safeStorage` |

---

## クラス: EncryptionService

### isAvailable(): boolean

暗号化機能が利用可能かどうか。

---

### encrypt(text: string): string

テキストを暗号化してBase64文字列で返す。

| パラメータ | 型 | 説明 |
|:-----------|:---|:-----|
| text | string | 暗号化する平文 |

**戻り値**: Base64エンコードされた暗号文

**フォールバック**: 暗号化が利用不可の場合は平文のまま返す

---

### decrypt(encryptedText: string): string

Base64暗号文を復号して平文を返す。

**フォールバック**: 
- 暗号化が利用不可の場合はそのまま返す
- 復号失敗時（平文だった場合等）もそのまま返す

---

## セキュリティ

| OS | 使用される暗号化機構 |
|:---|:--------------------|
| Windows | DPAPI (Data Protection API) |
| macOS | Keychain |
| Linux | libsecret |

---

## 使用箇所

- `PrismaUserProfileRepository`: APIキーの保存時に暗号化

---

## 使用例

```typescript
const encryptionService = new EncryptionService();

// 暗号化
const encrypted = encryptionService.encrypt('sk-abc123...');

// 復号
const decrypted = encryptionService.decrypt(encrypted);
```

---

## 関連ドキュメント

- [UserProfile_Spec.md](../UserProfile_Spec.md) - APIキー管理

---

## 変更履歴

| 日付 | 変更内容 |
|:-----|:---------|
| 2026-01-14 | 初版作成 |

/**
 * GlobalConstantRepository
 * グローバル定数(m_global_constant)へのアクセスインターフェース
 */

export interface GlobalConstantRepository {
    findByCategory(category: string): Promise<{ keyName: string; keyValue: string }[]>;
    getValue(keyName: string): Promise<string | null>;
}

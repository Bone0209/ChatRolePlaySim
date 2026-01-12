/**
 * PromptTemplate - プロンプトテンプレート処理
 * 
 * マークダウンファイルからプロンプトを読み込み、変数を置換します。
 */

import fs from 'fs';

/**
 * プロンプトテンプレートクラス
 */
export class PromptTemplate {
    private templateContent: string;

    constructor(filePath: string) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Template file not found at: ${filePath}`);
        }
        this.templateContent = fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * テンプレート内のプレースホルダー {{key}} を値で置換
     * - オブジェクト/配列はJSON文字列化
     * - その他は文字列化
     * 
     * @param variables プレースホルダーと値のマップ
     * @returns 処理済み文字列
     */
    public render(variables: Record<string, unknown>): string {
        let result = this.templateContent;

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            let replacement = '';

            if (typeof value === 'object' && value !== null) {
                replacement = JSON.stringify(value, null, 2);
            } else {
                replacement = String(value);
            }

            result = result.split(placeholder).join(replacement);
        }

        return result;
    }
}

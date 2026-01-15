
/**
 * PromptTableBuilder
 * 
 * LLMプロンプト用にMarkdownテーブルを生成するUtilityクラス
 */
export class PromptTableBuilder {
    private rows: Array<{ key: string; value: string; }> = [];

    constructor(private title?: string) { }

    /**
     * 行を追加
     */
    addRow(key: string, value: string): this {
        if (value) {
            this.rows.push({ key, value });
        }
        return this;
    }

    /**
     * Mapから行を一括追加
     */
    addMap(map: Map<string, any>, excludeKeys: string[] = []): this {
        map.forEach((val, key) => {
            if (!excludeKeys.includes(key) && val) {
                // valがオブジェクトの場合は文字列化を試みる
                let strVal = val;
                if (typeof val === 'object') {
                    if (val.value !== undefined) {
                        strVal = val.value; // ParameterMap pattern
                    } else if (val.val !== undefined) {
                        strVal = val.val;   // Data structure pattern
                    } else {
                        strVal = JSON.stringify(val);
                    }
                }
                this.addRow(key, String(strVal));
            }
        });
        return this;
    }

    /**
     * 文字列として出力
     */
    toString(): string {
        if (this.rows.length === 0) return '';

        let output = '';
        if (this.title) {
            output += `## ${this.title}\n`;
        }

        output += '| Key | Value |\n';
        output += '| :--- | :--- |\n';

        for (const row of this.rows) {
            output += `| **${row.key}** | ${row.value} |\n`;
        }

        return output.trim();
    }
}

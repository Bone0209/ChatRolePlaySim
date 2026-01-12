/**
 * LlmGateway - LLM APIへのアクセスをカプセル化するゲートウェイ
 * 
 * 外部APIの詳細をインフラ層に隠蔽し、アプリケーション層からはシンプルに利用できるようにします。
 */

import { getAppConfig } from '../config';
import type { ModelConfig } from '../config';

/** LLMリクエストのオプション */
export interface LlmRequestOptions {
    /** 使用するモデル設定（指定しない場合はメインモデル） */
    model?: 'main' | 'sub';
    /** 温度パラメータ */
    temperature?: number;
    /** タイムアウト（ミリ秒） */
    timeoutMs?: number;
    /** レスポンスフォーマット */
    responseFormat?: 'text' | 'json';
}

/** LLMメッセージ */
export interface LlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/** LLMレスポンス */
export interface LlmResponse {
    content: string;
    raw?: any;
}

/**
 * LLM APIゲートウェイ
 * OpenAI互換APIを使用したLLMアクセスを提供
 */
export class LlmGateway {

    /**
     * チャット補完を生成
     * @param messages メッセージ履歴
     * @param options オプション
     * @returns LLMの応答
     */
    async generateCompletion(
        messages: LlmMessage[],
        options: LlmRequestOptions = {}
    ): Promise<LlmResponse> {
        const config = getAppConfig();
        const modelConfig = options.model === 'sub' ? config.subModel : config.mainModel;
        const temperature = options.temperature ?? config.temperature;
        const timeoutMs = options.timeoutMs ?? 180000;

        const payload = {
            model: modelConfig.model,
            messages,
            temperature,
            ...(options.responseFormat === 'json' && {
                response_format: { type: 'json_object' }
            })
        };

        console.log(`[LlmGateway] Calling ${modelConfig.model} at ${modelConfig.baseUrl}`);

        const response = await this.fetchWithTimeout(
            `${modelConfig.baseUrl}/chat/completions`,
            {
                method: 'POST',
                headers: this.buildHeaders(modelConfig),
                body: JSON.stringify(payload)
            },
            timeoutMs
        );

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`LLM API Error (${response.status}): ${errorBody.substring(0, 200)}`);
        }

        const responseText = await response.text();
        let data: any;

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.warn('[LlmGateway] Response is not valid JSON:', responseText.substring(0, 100));
            throw new Error(`LLM API returned invalid JSON: ${responseText.substring(0, 50)}...`);
        }

        const content = data.choices?.[0]?.message?.content || '';

        return {
            content: this.cleanThinkingModelResponse(content),
            raw: data
        };
    }

    /**
     * JSONレスポンスを期待するプロンプトの実行
     * @param systemPrompt システムプロンプト
     * @param userPrompt ユーザープロンプト
     * @param options オプション
     * @returns パースされたJSONオブジェクト
     */
    async generateJson<T = any>(
        systemPrompt: string,
        userPrompt: string,
        options: LlmRequestOptions = {}
    ): Promise<T> {
        const messages: LlmMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        const response = await this.generateCompletion(messages, {
            ...options,
            responseFormat: 'json'
        });

        // JSONをパース
        let content = response.content;

        // Markdownコードブロックを除去
        const jsonBlock = content.match(/```json?\s*([\s\S]*?)```/);
        if (jsonBlock) {
            content = jsonBlock[1].trim();
        }

        try {
            return JSON.parse(content);
        } catch (e) {
            console.error('[LlmGateway] Failed to parse JSON response:', content.substring(0, 200));
            throw new Error('Failed to parse LLM JSON response');
        }
    }

    /**
     * テキスト生成（シンプルな1ターン）
     */
    async generateText(
        systemPrompt: string,
        userPrompt: string,
        options: LlmRequestOptions = {}
    ): Promise<string> {
        const messages: LlmMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        const response = await this.generateCompletion(messages, options);
        return response.content;
    }

    // --- Private Helper Methods ---

    /**
     * タイムアウト付きfetch
     */
    private async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeoutMs: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            return response;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * ヘッダーを構築
     */
    private buildHeaders(config: ModelConfig): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        return headers;
    }

    /**
     * Thinkingモデルのレスポンスをクリーンアップ
     * <think>...</think> タグを除去
     */
    private cleanThinkingModelResponse(content: string): string {
        // <think>...</think> タグを除去
        let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // 空になった場合は元のコンテンツを返す
        if (!cleaned) {
            return content;
        }

        return cleaned;
    }
}

// シングルトンインスタンス
let llmGatewayInstance: LlmGateway | null = null;

/**
 * LlmGatewayのシングルトンインスタンスを取得
 */
export function getLlmGateway(): LlmGateway {
    if (!llmGatewayInstance) {
        llmGatewayInstance = new LlmGateway();
    }
    return llmGatewayInstance;
}

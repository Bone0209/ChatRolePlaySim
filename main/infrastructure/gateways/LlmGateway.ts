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
    /** 設定の上書き (API Keyなど) */
    configOverride?: ModelConfig;
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
        let modelConfig = options.model === 'sub' ? config.subModel : config.mainModel;

        if (options.configOverride) {
            modelConfig = options.configOverride;
        }

        const temperature = options.temperature ?? config.temperature;
        const timeoutMs = options.timeoutMs ?? 180000;

        const payload = {
            model: modelConfig.model,
            messages,
            temperature,
            // Strict 'json_object' mode causes errors with some providers/proxies (e.g. Minimax or strict schemas).
            // We rely on text parsing in generateJson instead.
            // ...(options.responseFormat === 'json' && {
            //     response_format: { type: 'json_object' }
            // })
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
            console.warn('[LlmGateway] Response is not valid JSON:', responseText.substring(0, 500));
            console.warn('[LlmGateway] Status:', response.status, 'OK:', response.ok);
            throw new Error(`LLM API returned invalid JSON (${response.status}): ${responseText.substring(0, 100)}...`);
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
        } else {
            // Markdownがない場合、最初の '{' から最後の '}' までを抽出する試み
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                content = content.substring(firstBrace, lastBrace + 1);
            }
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

    // --- Domain Specific Methods ---

    /**
     * ユーザーアクションの分析
     */
    async analyzeAction(
        userInput: string,
        context: {
            worldTime: string;
            location: string;
            targetName: string;
            targetRole: string;
            targetAffection: number;
        }
    ): Promise<any> {
        const { PromptTemplate } = await import('../prompts/PromptTemplate');
        const path = await import('path');

        // プロンプトパスの解決 (開発環境と本番環境で異なる可能性対応)
        const promptPath = path.join(process.cwd(), 'main', 'prompts', 'action_analysis.md');
        const template = new PromptTemplate(promptPath);

        const promptText = template.render({
            worldTime: context.worldTime,
            location: context.location,
            targetName: context.targetName,
            targetRole: context.targetRole,
            targetAffection: context.targetAffection,
            userInput: userInput
        });

        // System/User分割はテンプレート構造によるが、ここでは簡易的にSystem=Prompt, User=Emptyまたは統合
        // action_analysis.md は [System] [User] タグ等を含む形式かもしれないため、
        // 既存のファイルをパースするか、単純にUserメッセージとして送るか。
        // ここでは単純化のため全文をSystemプロンプトとして扱う、またはgenerateJsonの引数構造に合わせる。
        // 既存の action_analysis.md は全体が指示書なので、Systemプロンプトとして送信し、Userの入力は最後に付加済みとみなす。

        return this.generateJson(promptText, "Parse the above input.", { responseFormat: 'json', model: 'sub' });
    }

    /**
     * 好感度の分析
     */
    async analyzeAffection(
        userMessage: string,
        modelResponse: string,
        targetName: string,
        currentAffection: number
    ): Promise<{ affection_delta: number; reason: string }> {
        const { PromptTemplate } = await import('../prompts/PromptTemplate');
        const path = await import('path');

        const promptPath = path.join(process.cwd(), 'main', 'prompts', 'affection_analysis.md');
        const template = new PromptTemplate(promptPath);

        const promptText = template.render({
            userMessage,
            modelResponse,
            targetName,
            currentAffection
        });

        try {
            return await this.generateJson(promptText, "Analyze affection change.", { responseFormat: 'json', model: 'sub' });
        } catch (e) {
            console.warn("Affection analysis failed, defaulting to 0 change", e);
            return { affection_delta: 0, reason: "Analysis failed" };
        }
    }

    /**
     * ロールプレイ応答の生成
     */
    async generateRolePlayResponse(context: {
        world: any;
        playerMessage: string;
        targetNpc: any;
        allEntities: any[];
        history: any[];
        actionAnalysis: any;
        config?: ModelConfig;
        playerProfile?: { name: string; gender: string; description: string };
    }): Promise<string> {
        const { PromptTemplate } = await import('../prompts/PromptTemplate');
        const path = await import('path');

        // システムプロンプト (user_prompt.md または system.md を使用)
        // ここでは user_prompt.md に動的コンテキストを注入する前提
        const promptPath = path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md');
        const template = new PromptTemplate(promptPath);

        // コンテキストの構築 (パラメータ等はDTOやEntityから抽出)
        const player = context.playerProfile || { name: 'Player', gender: 'Unknown', description: '' };
        const promptText = template.render({
            characterName: context.targetNpc.name,
            targetName: context.targetNpc.name,
            // Player profile data
            playerName: player.name,
            playerGender: player.gender,
            playerDescription: player.description || 'N/A',
            playerCondition: 'Normal', // TODO: Get from game state
            // Other context
            worldTime: '00:00', // TODO
            location: 'Unknown', // TODO
            weather: 'Clear', // TODO
            userInput: context.playerMessage,
            actionAnalysis: JSON.stringify(context.actionAnalysis)
        });

        // 実際のチャット履歴をメッセージ配列に変換
        const messages: any[] = [
            { role: 'system', content: promptText }, // システム指示として扱う
            ...context.history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: context.playerMessage }
        ];

        const response = await this.generateCompletion(messages, {
            model: 'main',
            configOverride: context.config
        });
        return response.content;
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

/**
 * LlmGateway - LLM APIへのアクセスをカプセル化するゲートウェイ
 * 
 * 外部APIの詳細をインフラ層に隠蔽し、アプリケーション層からはシンプルに利用できるようにします。
 */

import { getAppConfig } from '../config';
import type { ModelConfig } from '../config';
import { IApiLogRepository } from '../../domain/repositories/IApiLogRepository';

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
    /** ログ用メタデータ */
    metadata?: {
        worldId?: string;
        entityId?: string;
        apiType?: string;
    };
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
    constructor(private apiLogRepository?: IApiLogRepository) { }


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
        const startTime = Date.now();
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
        };

        console.log(`[LlmGateway] Calling ${modelConfig.model} at ${modelConfig.baseUrl}`);

        let responseText = '';
        let statusCode = 0;
        let errorMessage: string | undefined;

        try {
            const response = await this.fetchWithTimeout(
                `${modelConfig.baseUrl}/chat/completions`,
                {
                    method: 'POST',
                    headers: this.buildHeaders(modelConfig),
                    body: JSON.stringify(payload)
                },
                timeoutMs
            );

            statusCode = response.status;

            if (!response.ok) {
                const errorBody = await response.text();
                errorMessage = `LLM API Error (${response.status}): ${errorBody.substring(0, 200)}`;
                throw new Error(errorMessage);
            }

            responseText = await response.text();
            let data: any;

            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.warn('[LlmGateway] Response is not valid JSON:', responseText.substring(0, 500));
                console.warn('[LlmGateway] Status:', response.status, 'OK:', response.ok);
                errorMessage = `LLM API returned invalid JSON (${response.status})`;
                throw new Error(`${errorMessage}: ${responseText.substring(0, 100)}...`);
            }

            const content = data.choices?.[0]?.message?.content || '';

            // ログ記録 (成功)
            if (this.apiLogRepository) {
                this.apiLogRepository.create({
                    apiType: options.metadata?.apiType || 'chat',
                    modelName: modelConfig.model,
                    request: JSON.stringify(payload),
                    response: responseText,
                    statusCode: statusCode,
                    executionTimeMs: Date.now() - startTime,
                    worldId: options.metadata?.worldId,
                    entityId: options.metadata?.entityId
                }).catch(err => console.error('[LlmGateway] Failed to log API call:', err));
            }

            return {
                content: this.cleanThinkingModelResponse(content),
                raw: data
            };

        } catch (error) {
            // ログ記録 (エラー)
            if (this.apiLogRepository) {
                this.apiLogRepository.create({
                    apiType: options.metadata?.apiType || 'chat',
                    modelName: modelConfig.model,
                    request: JSON.stringify(payload),
                    response: responseText, // 部分的でも記録
                    statusCode: statusCode || 500,
                    errorMessage: errorMessage || (error as Error).message,
                    executionTimeMs: Date.now() - startTime,
                    worldId: options.metadata?.worldId,
                    entityId: options.metadata?.entityId
                }).catch(err => console.error('[LlmGateway] Failed to log API error:', err));
            }
            throw error;
        }
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

    /**
     * チャット補完をストリーミングで生成
     * @param messages メッセージ履歴
     * @param options オプション
     * @returns 非同期イテレータ (各チャンクの文字列)
     */
    async *generateStream(
        messages: LlmMessage[],
        options: LlmRequestOptions = {}
    ): AsyncGenerator<string> {
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
            stream: true // Enable streaming
        };

        console.log(`[LlmGateway] Calling (Stream) ${modelConfig.model} at ${modelConfig.baseUrl}`);

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

        if (!response.body) {
            throw new Error('Response body is null');
        }

        // Node.js ReadableStream handling
        const reader = (response.body as any).getReader ? (response.body as any).getReader() : null;

        // Handling for Node.js environment (node-fetch or native fetch with Node streams)
        // If Response.body is a Node.js stream, we iterate it.
        // If it's a web standard ReadableStream (e.g. Electron renderer or newer Node), we read via reader.

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        if (reader) {
            // Web Standard ReadableStream
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the incomplete line in buffer

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                        if (trimmedLine.startsWith('data: ')) {
                            const dataStr = trimmedLine.substring(6);
                            try {
                                const data = JSON.parse(dataStr);
                                const content = data.choices?.[0]?.delta?.content || '';
                                if (content) yield content;
                            } catch (e) {
                                // Ignore parse errors for partial lines
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } else {
            // For Node.js internal fetch (undici) or similar where body is async iterable
            // @ts-ignore
            for await (const chunk of response.body) {
                const text = decoder.decode(chunk as BufferSource, { stream: true });
                buffer += text;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                    if (trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.substring(6);
                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.choices?.[0]?.delta?.content || '';
                            if (content) yield content;
                        } catch (e) {
                            // Ignore
                        }
                    }
                }
            }
        }
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

        return this.generateJson(promptText, "Parse the above input.", {
            responseFormat: 'json',
            model: 'sub',
            metadata: {
                apiType: 'action_analysis'
            }
        });
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
            return await this.generateJson(promptText, "Analyze affection change.", {
                responseFormat: 'json',
                model: 'sub',
                metadata: {
                    apiType: 'affection_judge',
                    entityId: targetName // 名前で代用、IDがあればベスト
                }
            });
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
    }): Promise<{ type: string; order: number; body: string; }[]> {
        const { PromptTemplate } = await import('../prompts/PromptTemplate');
        const path = await import('path');

        // システムプロンプト (user_prompt.md または system.md を使用)
        // ここでは user_prompt.md に動的コンテキストを注入する前提
        const promptPath = path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md');
        const template = new PromptTemplate(promptPath);

        // コンテキストの構築 (パラメータ等はDTOやEntityから抽出)
        const player = context.playerProfile || { name: 'Player', gender: 'Unknown', description: '' };

        // Helper to get parameter with casing fallback
        const getParam = (keys: string[]): string => {
            for (const key of keys) {
                const val = context.targetNpc.getParameterValue(key);
                if (val) return val as string;
            }
            return '';
        };

        // Extract NPC Persona Data
        const firstPerson = getParam(['firstPerson', 'FirstPerson']) || '私';
        const ending = getParam(['ending', 'Ending']) || 'です';

        // Use PromptTableBuilder for dynamic profile generation
        const { PromptTableBuilder } = await import('../../lib/PromptTableBuilder');
        const builder = new PromptTableBuilder(); // Title is handled in template, or we can remove it from template

        // Add standard fields
        builder.addRow('Name', context.targetNpc.name);
        builder.addRow('Description', context.targetNpc.description);

        // Add all persona parameters
        const personaMap = (context.targetNpc as any)._persona; // Access internal map if possible, or use getter
        if (personaMap) {
            builder.addMap(personaMap);
        } else {
            // Fallback if direct access not available (should use public getter in real entity)
            const params = context.targetNpc.getAllParameters();
            Object.entries(params).forEach(([key, val]: [string, any]) => {
                if (val.category === 'persona' || val.category === 'basic') {
                    builder.addRow(key, val.val);
                }
            });
        }

        const targetProfile = builder.toString();

        const promptText = template.render({
            characterName: context.targetNpc.name,
            targetName: context.targetNpc.name,
            targetFirstPerson: firstPerson,
            targetEnding: ending,
            targetProfile: targetProfile,
            // Player profile data
            playerName: player.name,
            playerGender: player.gender,
            playerDescription: player.description || 'N/A',
            playerCondition: 'Normal', // TODO: Get from game state
            // Other context
            worldTime: context.world.worldTime || '12:00',
            location: context.targetNpc.getLocation() || 'Unknown Location',
            weather: context.world.weather || 'Clear',
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
            configOverride: context.config,
            responseFormat: 'json', // 明示的にJSONを指定
            metadata: {
                apiType: 'chat',
                worldId: context.world.id,
                entityId: context.targetNpc.id
            }
        });

        // JSONパース処理
        let content = response.content;
        const jsonBlock = content.match(/```json?\s*([\s\S]*?)```/);
        if (jsonBlock) {
            content = jsonBlock[1].trim();
        } else {
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                content = content.substring(firstBrace, lastBrace + 1);
            }
        }

        try {
            const parsed = JSON.parse(content);
            // chats配列を返す（呼び出し元で処理）
            return parsed.chats || [];
        } catch (e) {
            console.error('[LlmGateway] Failed to parse JSON response:', content);
            // フォールバック: パース失敗時は生のテキストをbodyとする単一メッセージとして返す
            // Strip any <emo> tags from the raw content as they are deprecated
            let fallbackBody = response.content;
            fallbackBody = fallbackBody.replace(/<emo>[\s\S]*?<\/emo>\n?/gi, '');
            return [{
                type: 'C',
                order: 1,
                body: fallbackBody.trim()
            }];
        }
    }
}

// シングルトンインスタンス
let llmGatewayInstance: LlmGateway | null = null;

/**
 * LlmGatewayのシングルトンインスタンスを取得
 */
export function getLlmGateway(repo?: IApiLogRepository): LlmGateway {
    if (!llmGatewayInstance) {
        llmGatewayInstance = new LlmGateway(repo);
    }
    return llmGatewayInstance;
}

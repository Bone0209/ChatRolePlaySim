/**
 * WorldHandler - ワールド関連のIPCハンドラ
 * 
 * Electron IPCからのリクエストを受け取り、UseCaseに委譲します。
 * このクラスはビジネスロジックを持たず、入出力の変換のみを行います。
 */

import { ipcMain } from 'electron';
import { IWorldRepository, IEntityRepository } from '../../domain/repositories';
import { CreateWorldUseCase, GetWorldsUseCase } from '../../application/usecases/world';
import { CreateWorldRequestDto } from '../../application/dtos';
import { LlmGateway } from '../../infrastructure/gateways';
import { PromptTemplate } from '../../infrastructure/prompts';
import path from 'path';
import fs from 'fs';

/**
 * ワールドIPCハンドラを登録
 */
export function registerWorldHandler(
    worldRepository: IWorldRepository,
    entityRepository: IEntityRepository,
    llmGateway: LlmGateway,
    promptsPath: string
) {
    console.log('[IPC] Registering world handlers...');

    // ワールド一覧取得
    ipcMain.handle('world:list', async () => {
        const useCase = new GetWorldsUseCase(worldRepository);
        return useCase.execute();
    });

    // ワールド取得（ID指定）
    ipcMain.handle('world:get', async (event, id: string) => {
        const useCase = new GetWorldsUseCase(worldRepository);
        return useCase.findById(id);
    });

    // ワールド作成
    ipcMain.handle('world:create', async (event, data: CreateWorldRequestDto) => {
        const useCase = new CreateWorldUseCase(worldRepository, entityRepository);
        return useCase.execute(data);
    });

    // ワールド削除
    ipcMain.handle('world:delete', async (event, id: string) => {
        await worldRepository.delete(id);
        return { success: true };
    });

    // AI生成（タイトル、説明、NPC）
    ipcMain.handle('world:generate', async (event, { type, context }: { type: 'title' | 'description' | 'npc', context: string }) => {
        console.log(`[WorldHandler] Generating ${type}...`);

        // テンプレート名を決定
        let templateName = 'world_gen_desc.md';
        if (type === 'title') templateName = 'world_gen_title.md';
        if (type === 'npc') templateName = 'world_gen_npc.md';

        const templatePath = path.join(promptsPath, templateName);

        if (!fs.existsSync(templatePath)) {
            console.error(`[WorldHandler] Template not found: ${templatePath}`);
            return 'Error: Template not found';
        }

        // プロンプトを構築
        const template = new PromptTemplate(templatePath);
        const flavor = getRandomFlavor();
        const userPrompt = template.render({ context, flavor, seed: Math.random().toString(36).substring(7) });

        // システムプロンプト
        const systemTemplatePath = path.join(promptsPath, 'world_gen_system.md');
        let systemPrompt = "あなたはファンタジーRPGの世界設定を作成するクリエイティブなアシスタントです。";
        if (fs.existsSync(systemTemplatePath)) {
            systemPrompt = fs.readFileSync(systemTemplatePath, 'utf-8');
        }

        try {
            // 使用するモデルを決定
            const modelType = type === 'title' ? 'sub' : 'main';

            const result = await llmGateway.generateText(systemPrompt, userPrompt, {
                model: modelType as 'main' | 'sub'
            });

            return result;
        } catch (error: any) {
            console.error(`[WorldHandler] Generation failed:`, error);
            return `Error: ${error.message}`;
        }
    });
}

/**
 * ランダムなフレーバーテキストを取得
 */
function getRandomFlavor(): string {
    const flavors = [
        "魔法と剣の世界",
        "スチームパンクの都市",
        "神話と伝説の国",
        "暗黒時代の王国",
        "海賊と冒険の時代"
    ];
    return flavors[Math.floor(Math.random() * flavors.length)];
}

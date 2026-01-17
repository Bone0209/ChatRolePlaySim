import { IChatRepository } from "../../../domain/repositories/IChatRepository";
import { IEntityRepository } from "../../../domain/repositories/IEntityRepository";
import { IWorldRepository } from "../../../domain/repositories/IWorldRepository";
import { LlmGateway } from "../../../infrastructure/gateways/LlmGateway";
import { UpdateAffectionUseCase } from "../../usecases/game/UpdateAffectionUseCase";
import { ChatMessage } from "../../../domain/entities/ChatMessage";
import { PrismaUserProfileRepository } from "../../../infrastructure/repositories/PrismaUserProfileRepository";
import { MissingConfigurationError } from "../../errors/MissingConfigurationError";
import { GlobalConstantRepository } from "../../../domain/repositories/IGlobalConstantRepository";

export class GenerateNpcResponseUseCase {
    constructor(
        private chatRepo: IChatRepository,
        private entityRepo: IEntityRepository,
        private worldRepo: IWorldRepository,
        private llmGateway: LlmGateway,
        private updateAffectionUseCase: UpdateAffectionUseCase,
        private userProfileRepo: PrismaUserProfileRepository,
        private globalConstantRepo: GlobalConstantRepository
    ) { }

    async execute(input: {
        worldId: string;
        message: string;
        targetId: string;
        history?: { role: string; content: string }[];
        onProgress?: (event: { type: string, data: any }) => void;
    }): Promise<string> {
        // 0. Fetch Settings & Validate
        const globalSettings = await this.userProfileRepo.getGlobalSettings();

        const apiKey = globalSettings.find(s => s.keyName === 'sys.llm.first.api_key')?.keyValue;
        const apiEndpoint = globalSettings.find(s => s.keyName === 'sys.llm.first.api_endpoint')?.keyValue;
        const modelName = globalSettings.find(s => s.keyName === 'sys.llm.first.model')?.keyValue;

        if (!apiKey || !apiEndpoint) {
            throw new MissingConfigurationError("LLM configuration is missing. Please check Settings.");
        }

        const llmConfig = {
            apiKey,
            baseUrl: apiEndpoint,
            model: modelName || 'gpt-3.5-turbo',
        };

        // Fetch Active Profile
        const activeProfileIdSetting = globalSettings.find(s => s.keyName === 'sys.active_profile');
        const activeProfileId = activeProfileIdSetting && activeProfileIdSetting.keyValue ? parseInt(activeProfileIdSetting.keyValue) : null;

        let playerProfile = {
            name: "Player",
            gender: "Unknown",
            description: ""
        };
        if (activeProfileId) {
            const profileSettings = await this.userProfileRepo.getProfileSettings(activeProfileId);
            const nameSetting = profileSettings.find(s => s.keyName === 'PlayerName');
            const genderSetting = profileSettings.find(s => s.keyName === 'PlayerGender');
            const descSetting = profileSettings.find(s => s.keyName === 'PlayerDescription');

            if (nameSetting && nameSetting.keyValue) {
                playerProfile.name = nameSetting.keyValue;
            }
            if (genderSetting && genderSetting.keyValue) {
                playerProfile.gender = genderSetting.keyValue;
            }
            if (descSetting && descSetting.keyValue) {
                playerProfile.description = descSetting.keyValue;
            }
        }

        // 1. Validate World & NPC
        const world = await this.worldRepo.findById(input.worldId);
        if (!world) throw new Error("World not found");

        const npc = await this.entityRepo.findById(input.targetId);
        if (!npc) throw new Error("Target NPC not found");

        // 2. Action Analysis
        const context = {
            worldTime: "00:00", // TODO
            location: "Unknown", // TODO
            targetName: npc.name,
            targetRole: "Partner", // TODO
            targetAffection: npc.getAffection()
        };

        const analysis = await this.llmGateway.analyzeAction(input.message, context);

        // 3. Generate Response & Stream Processing
        // Fetch entities for context (if needed for PromptTemplate in future)
        // const entities = await this.entityRepo.findByWorldId(input.worldId);

        const { PromptTemplate } = await import('../../../infrastructure/prompts/PromptTemplate');
        const path = await import('path');
        const promptPath = path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md');
        const template = new PromptTemplate(promptPath);

        const getParam = (keys: string[]): string => {
            for (const key of keys) {
                const val = npc.getParameterValue(key);
                if (val) return val as string;
            }
            return '';
        };

        const firstPerson = getParam(['firstPerson', 'FirstPerson']) || '私';
        const ending = getParam(['ending', 'Ending']) || 'です';

        const { PromptTableBuilder } = await import('../../../lib/PromptTableBuilder');
        const builder = new PromptTableBuilder();
        builder.addRow('Name', npc.name);
        builder.addRow('Description', npc.description);

        const personaMap = (npc as any)._persona;
        if (personaMap) {
            builder.addMap(personaMap);
        } else {
            const params = npc.getAllParameters();
            Object.entries(params).forEach(([key, val]: [string, any]) => {
                if (val.category === 'persona' || val.category === 'basic') {
                    builder.addRow(key, val.val);
                }
            });
        }
        const targetProfile = builder.toString();

        const promptText = template.render({
            characterName: npc.name,
            targetName: npc.name,
            targetFirstPerson: firstPerson,
            targetEnding: ending,
            targetProfile: targetProfile,
            playerName: playerProfile.name,
            playerGender: playerProfile.gender,
            playerDescription: playerProfile.description || 'N/A',
            playerCondition: 'Normal',
            worldTime: '12:00',
            location: npc.getLocation() || 'Unknown Location',
            weather: 'Clear',
            userInput: input.message,
            actionAnalysis: JSON.stringify(analysis),
            conversationHistory: input.history?.map(h =>
                `${h.role === 'user' ? '(User)' : npc.name}: ${h.content}`
            ).join('\n') || ''
        });

        const llmMessages = [
            { role: 'system', content: promptText }
        ] as any[];

        // Init StreamParser
        const { StreamParser } = await import('../../../utils/StreamParser');

        const narrativeTag = (await this.globalConstantRepo.getValue('CHAT_TAG_NARRATIVE')) || 'narrative';
        const speechTag = (await this.globalConstantRepo.getValue('CHAT_TAG_SPEECH')) || 'speech';
        const eventTag = (await this.globalConstantRepo.getValue('CHAT_TAG_EVENT')) || 'event';
        const logTag = (await this.globalConstantRepo.getValue('CHAT_TAG_LOG')) || 'log';
        const announceTag = (await this.globalConstantRepo.getValue('CHAT_TAG_ANNOUNCE')) || 'announce';

        const parser = new StreamParser({
            narrative: { tag: narrativeTag, parameterized: false },
            speech: { tag: speechTag, parameterized: true },
            event: { tag: eventTag, parameterized: false },
            log: { tag: logTag, parameterized: false },
            announce: { tag: announceTag, parameterized: false }
        });

        // Setup Stream Handling
        let fullText = '';
        let currentBlockType = 'unknown';

        parser.on('start', (block) => {
            currentBlockType = block.type;
            if (currentBlockType === 'log' || currentBlockType === 'event') return;

            if (input.onProgress) {
                input.onProgress({ type: 'block:start', data: block });
            }
        });

        parser.on('data', (chunk) => {
            if (currentBlockType === 'log' || currentBlockType === 'event') return;

            if (input.onProgress) {
                input.onProgress({ type: 'block:data', data: chunk });
            }
        });

        // Execute Stream
        try {
            const stream = this.llmGateway.generateStream(llmMessages, {
                model: 'main',
                configOverride: llmConfig,
                metadata: {
                    apiType: 'chat',
                    worldId: input.worldId,
                    entityId: npc.id
                }
            });

            for await (const chunk of stream) {
                fullText += chunk;
                parser.process(chunk);
            }
        } catch (e) {
            console.error('Stream generation failed:', e);
            throw e;
        }

        // 4. Save Assistant Responses
        const blocks: { type: string, name?: string, content: string }[] = [];
        let currentBlockIndex = -1;

        const captureParser = new StreamParser({
            narrative: { tag: narrativeTag, parameterized: false },
            speech: { tag: speechTag, parameterized: true },
            event: { tag: eventTag, parameterized: false },
            log: { tag: logTag, parameterized: false },
            announce: { tag: announceTag, parameterized: false }
        });

        captureParser.on('start', (block) => {
            blocks.push({ type: block.type, name: block.name, content: '' });
            currentBlockIndex++;
        });

        captureParser.on('data', (chunk) => {
            if (currentBlockIndex >= 0) {
                blocks[currentBlockIndex].content += chunk;
            }
        });

        captureParser.process(fullText);

        let combinedResponseText = '';
        const messageBuffer: { type: 'CHAT_NPC' | 'CHAT_SYSTEM'; body: string; isVisible: boolean }[] = [];

        for (const block of blocks) {
            let chatType: 'CHAT_NPC' | 'CHAT_SYSTEM' = 'CHAT_NPC';

            if (block.type === 'event' || block.type === 'log' || block.type === 'announce') {
                chatType = 'CHAT_SYSTEM';
            }

            let blockString = '';
            let tag = block.type;
            const content = block.content.trim(); // Trim extra whitespace

            if (block.type === 'narrative') tag = narrativeTag;
            if (block.type === 'speech') {
                tag = speechTag;
                blockString = `[${tag}:${block.name || '???'}]\n${content}`;
            } else {
                if (block.type === 'event') tag = eventTag;
                if (block.type === 'log') tag = logTag;
                if (block.type === 'announce') tag = announceTag;
                blockString = `[${tag}]\n${content}`;
            }

            // Save to DB (Log and Event are hidden)
            const isVisible = (block.type !== 'log' && block.type !== 'event');

            // Should we merge hidden blocks? 
            // Currently merging strategy is by chatType (CHAT_NPC vs CHAT_SYSTEM).
            // LOG and EVENT are CHAT_SYSTEM. ANNOUNCE is CHAT_SYSTEM.
            // If we have [log] (hidden) then [announce] (visible), they are both CHAT_SYSTEM.
            // If we merge them, the whole message will have ONE visibility.
            // We CANNOT merge visible and invisible blocks into one ChatMessage entity if entity only has one isVisible flag.

            // So we must break the merge if visibility changes.
            // Check previous message visibility?
            // `messageBuffer` stores `{ type, body }`. It doesn't store visibility.
            // We need to upgrade messageBuffer to store visibility.

            // Let's modify buffer structure.
            // But first, let's update this replacement content to support that logic.
            // I'll rewrite the loop.

            // Check if buffer top matches type AND visibility.

            if (messageBuffer.length > 0) {
                const last = messageBuffer[messageBuffer.length - 1];
                if (last.type === chatType && last.isVisible === isVisible) {
                    last.body += '\n\n' + blockString;
                } else {
                    messageBuffer.push({ type: chatType, body: blockString, isVisible });
                }
            } else {
                messageBuffer.push({ type: chatType, body: blockString, isVisible });
            }

            combinedResponseText += blockString + '\n';
        }

        for (const item of messageBuffer) {
            const assistMsg = ChatMessage.create({
                worldId: input.worldId,
                type: item.type,
                message: item.body,
                entityId: item.type === 'CHAT_NPC' ? npc.id : undefined,
                isVisible: item.isVisible
            });
            await this.chatRepo.save(assistMsg);
        }

        // 5. Update Affection
        const affectionResult = await this.llmGateway.analyzeAffection(
            input.message,
            combinedResponseText,
            npc.name,
            npc.getAffection()
        );

        if (affectionResult.affection_delta !== 0) {
            await this.updateAffectionUseCase.execute({
                entityId: npc.id,
                delta: affectionResult.affection_delta,
                reason: affectionResult.reason
            });
        }

        return combinedResponseText;
    }
}

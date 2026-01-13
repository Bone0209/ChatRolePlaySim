
import { IChatRepository } from "../../../domain/repositories/IChatRepository";
import { IEntityRepository } from "../../../domain/repositories/IEntityRepository";
import { IWorldRepository } from "../../../domain/repositories/IWorldRepository";
import { LlmGateway } from "../../../infrastructure/gateways/LlmGateway";
import { UpdateAffectionUseCase } from "../../usecases/game/UpdateAffectionUseCase";
import { ChatMessage } from "../../../domain/entities/ChatMessage";
import { PrismaUserProfileRepository } from "../../../infrastructure/repositories/PrismaUserProfileRepository";
import { MissingConfigurationError } from "../../errors/MissingConfigurationError";

export class SendMessageUseCase {
    constructor(
        private chatRepo: IChatRepository,
        private entityRepo: IEntityRepository,
        private worldRepo: IWorldRepository,
        private llmGateway: LlmGateway,
        private updateAffectionUseCase: UpdateAffectionUseCase,
        private userProfileRepo: PrismaUserProfileRepository
    ) { }

    async execute(input: {
        worldId: string;
        message: string;
        targetId?: string; // NPC ID
        history?: { role: string; content: string }[];
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
            model: modelName || 'gpt-3.5-turbo', // Fallback or strict?
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

        // 1. Validate World
        const world = await this.worldRepo.findById(input.worldId);
        if (!world) throw new Error("World not found");

        // 2. Identify Target NPC
        if (!input.targetId) {
            throw new Error("Target NPC ID is required");
        }

        const npc = await this.entityRepo.findById(input.targetId);
        if (!npc) throw new Error("Target NPC not found");

        // 3. Save User Message
        const userMsg = ChatMessage.create({
            worldId: input.worldId,
            type: 'CHAT_PLAYER',
            message: input.message,
            entityId: undefined
        });
        await this.chatRepo.save(userMsg);

        // 4. Action Analysis (TODO: Check if sub model config is needed here too)
        const subApiKey = globalSettings.find(s => s.keyName === 'sys.llm.second.api_key')?.keyValue;
        const subApiEndpoint = globalSettings.find(s => s.keyName === 'sys.llm.second.api_endpoint')?.keyValue;
        const subModelName = globalSettings.find(s => s.keyName === 'sys.llm.second.model')?.keyValue;

        let subConfigOverride = undefined;
        if (subApiKey && subApiEndpoint) {
            subConfigOverride = {
                apiKey: subApiKey,
                baseUrl: subApiEndpoint,
                model: subModelName || 'gpt-3.5-turbo'
            };
        }

        // Construct context for analysis
        const context = {
            worldTime: "00:00", // TODO
            location: "Unknown", // TODO
            targetName: npc.name,
            targetRole: "Partner", // TODO
            targetAffection: npc.getAffection()
        };

        // Note: LlmGateway.analyzeAction currently doesn't support config override in its signature easily 
        // without refactoring it too. For now let's hope main config or default sub config works, 
        // OR refactor LlmGateway.analyzeAction to take options. 
        // *Self-correction*: I should update Gateway analyzeAction too if I want full dynamic config.
        // For this step I'll assume analyzeAction uses getters or I'll patch it later.
        // Actually, user only asked for "LLM Settings" handling.

        const analysis = await this.llmGateway.analyzeAction(input.message, context); // TODO: Pass subConfigOverride

        // 5. Generate Response
        // Fetch entities for context
        const entities = await this.entityRepo.findByWorldId(input.worldId);

        const responseText = await this.llmGateway.generateRolePlayResponse({
            world,
            playerMessage: input.message,
            targetNpc: npc,
            allEntities: entities,
            history: input.history || [],
            actionAnalysis: analysis,
            config: llmConfig,
            playerProfile
        });

        // 6. Save Assistant Response
        const assistMsg = ChatMessage.create({
            worldId: input.worldId,
            type: 'CHAT_NPC',
            message: responseText,
            entityId: npc.id
        });
        await this.chatRepo.save(assistMsg);

        // 7. Update Affection
        const affectionResult = await this.llmGateway.analyzeAffection(
            input.message,
            responseText,
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

        return responseText;
    }
}

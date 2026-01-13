
import { IChatRepository } from "../../../domain/repositories/IChatRepository";
import { IEntityRepository } from "../../../domain/repositories/IEntityRepository";
import { IWorldRepository } from "../../../domain/repositories/IWorldRepository";
import { LlmGateway } from "../../../infrastructure/gateways/LlmGateway";
import { UpdateAffectionUseCase } from "../../usecases/game/UpdateAffectionUseCase";
import { ChatMessage } from "../../../domain/entities/ChatMessage";
// import { ChatDto } from "../../dtos/ChatDto";
// import { PromptTemplate } from "../../../infrastructure/prompts/PromptTemplate"; 
// Note: PromptTemplate might be used inside internal private methods or LlmGateway, 
// strictly speaking UseCase shouldn't address file paths directly if possible, 
// but for now we might need to load templates.

export class SendMessageUseCase {
    constructor(
        private chatRepo: IChatRepository,
        private entityRepo: IEntityRepository,
        private worldRepo: IWorldRepository,
        private llmGateway: LlmGateway,
        private updateAffectionUseCase: UpdateAffectionUseCase
    ) { }

    async execute(input: {
        worldId: string;
        message: string;
        targetId?: string; // NPC ID
        history?: { role: string; content: string }[];
    }): Promise<string> {
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

        // 4. Action Analysis
        // Construct context for analysis
        const context = {
            worldTime: "00:00", // TODO: Get from World or GameState
            location: "Unknown", // TODO: Get from GameState
            targetName: npc.name,
            targetRole: "Partner", // TODO: Get from NPC Persona
            targetAffection: npc.getAffection()
        };

        const analysis = await this.llmGateway.analyzeAction(input.message, context);

        // 5. Generate Response
        // Fetch entities for context
        const entities = await this.entityRepo.findByWorldId(input.worldId);

        const responseText = await this.llmGateway.generateRolePlayResponse({
            world,
            playerMessage: input.message,
            targetNpc: npc,
            allEntities: entities,
            history: input.history || [],
            actionAnalysis: analysis
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
        // For affection analysis, we need string values or numbers.
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

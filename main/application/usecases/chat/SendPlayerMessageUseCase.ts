import { IChatRepository } from "../../../domain/repositories/IChatRepository";
import { IEntityRepository } from "../../../domain/repositories/IEntityRepository";
import { IWorldRepository } from "../../../domain/repositories/IWorldRepository";
import { ChatMessage } from "../../../domain/entities/ChatMessage";

export class SendPlayerMessageUseCase {
    constructor(
        private chatRepo: IChatRepository,
        private entityRepo: IEntityRepository,
        private worldRepo: IWorldRepository
    ) { }

    async execute(input: {
        worldId: string;
        message: string;
        targetId?: string;
    }): Promise<void> {
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
    }
}

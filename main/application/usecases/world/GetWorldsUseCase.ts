/**
 * GetWorldsUseCase - ワールド一覧取得ユースケース
 */

import type { IWorldRepository } from '../../../domain/repositories';
import { World } from '../../../domain/entities';
import { WorldDto } from '../../dtos';

/**
 * ワールド一覧取得ユースケース
 */
export class GetWorldsUseCase {
    constructor(
        private readonly worldRepository: IWorldRepository
    ) { }

    /**
     * すべてのワールドを取得
     * @returns ワールドDTO配列
     */
    async execute(): Promise<WorldDto[]> {
        const worlds = await this.worldRepository.findAll();
        return worlds.map((world: World) => this.toDto(world));
    }

    /**
     * IDでワールドを取得
     * @param id ワールドID
     * @returns ワールドDTO、存在しない場合はnull
     */
    async findById(id: string): Promise<WorldDto | null> {
        const world = await this.worldRepository.findById(id);
        if (!world) return null;
        return this.toDto(world);
    }

    /**
     * ドメインエンティティからDTOへ変換
     */
    private toDto(world: World): WorldDto {
        return {
            id: world.id,
            name: world.name,
            prompt: world.prompt,
            createdAt: world.createdAt.toISOString()
        };
    }
}

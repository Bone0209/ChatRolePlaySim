
import { IEntityRepository } from '../../../domain/repositories';
import { EntityDto, GetLocationEntitiesRequestDto } from '../../dtos/EntityDto';

export class GetLocationEntitiesUseCase {
    constructor(
        private readonly entityRepository: IEntityRepository
    ) { }

    async execute(request: GetLocationEntitiesRequestDto): Promise<EntityDto[]> {
        const entities = await this.entityRepository.findNpcsByLocation(request.locationId, request.worldId);

        return entities.map(entity => {
            const allParams: Record<string, any> = {};
            const paramsMap = entity.getAllParameters();
            for (const [key, val] of Object.entries(paramsMap)) {
                allParams[key] = val.val;
            }

            return {
                id: entity.id,
                worldId: entity.worldId,
                type: entity.type,
                name: entity.name,
                description: entity.description || '',
                locationId: entity.getLocationId(),
                attributes: allParams
            };
        });
    }
}

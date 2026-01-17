
import { v4 as uuidv4 } from 'uuid';
import { ILocationRepository } from '../../../domain/repositories';
import { Location } from '../../../domain/entities/Location';
import { LocationDto, CreateLocationRequestDto } from '../../dtos/LocationDto';

export class CreateLocationUseCase {
    constructor(
        private readonly locationRepository: ILocationRepository
    ) { }

    async execute(request: CreateLocationRequestDto): Promise<LocationDto> {
        const id = uuidv4();

        // 属性マップの作成
        const attributes = new Map<string, string>();
        if (request.attributes) {
            for (const [key, value] of Object.entries(request.attributes)) {
                attributes.set(key, value);
            }
        }

        const location = Location.create({
            id,
            worldId: request.worldId,
            name: request.name,
            description: request.description,
            attributes
        });

        await this.locationRepository.save(location);

        return {
            id: location.id,
            worldId: location.worldId,
            name: location.name,
            description: location.description,
            attributes: Object.fromEntries(location.getAllAttributes())
        };
    }
}

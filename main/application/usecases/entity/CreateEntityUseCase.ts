
import { v4 as uuidv4 } from 'uuid';
import { IEntityRepository, ParameterCategory } from '../../../domain/repositories';
import { GameEntity, EntityType, ParameterMap } from '../../../domain/entities';
import { ParameterValue, Visibility } from '../../../domain/value-objects';
import { EntityDto, CreateEntityRequestDto } from '../../dtos/EntityDto';

export class CreateEntityUseCase {
    constructor(
        private readonly entityRepository: IEntityRepository
    ) { }

    async execute(request: CreateEntityRequestDto): Promise<EntityDto> {
        const id = uuidv4();

        const persona: ParameterMap = new Map();
        const parameter: ParameterMap = new Map();
        const state: ParameterMap = new Map();

        // 初期属性の振り分け
        if (request.attributes) {
            this.processAttributes(request.attributes, persona, parameter, state);
        }

        // LocationIdが指定されていればStateに追加
        if (request.initialLocationId) {
            state.set('locationId', ParameterValue.create(request.initialLocationId, Visibility.private()));
            // locationName等はattributesに含まれているか、別途解決が必要だが一旦これで
        }

        const entity = GameEntity.create({
            id,
            worldId: request.worldId,
            type: request.type as EntityType,
            name: request.name,
            description: request.description,
            persona,
            parameter,
            state
        });

        await this.entityRepository.save(entity);

        // DTO変換
        const allParams: Record<string, any> = {};
        const paramsMap = entity.getAllParameters();
        for (const [key, val] of Object.entries(paramsMap)) {
            allParams[key] = val.val; // 値のみ展開
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
    }

    private processAttributes(
        attributes: Record<string, any>,
        persona: ParameterMap,
        parameter: ParameterMap,
        state: ParameterMap
    ) {
        // キープレフィックス等による単純振り分け or マニュアル指定が必要だが、
        // ここでは簡易的に実装。CreateWorldと同様のロジックが望ましいが一元化されていないため再実装。
        // TODO: EnvironmentSplitter的なShared Logicにするべき

        const personaKeys = ['personality', 'role', 'tone', 'firstPerson', 'sentenceEnding', 'gender', 'ageGroup', 'appearance', 'background'];
        const stateKeys = ['location', 'locationId', 'condition', 'affection', 'mood', 'weather'];

        for (const [key, rawValue] of Object.entries(attributes)) {
            let paramValue: ParameterValue<unknown>;
            if (rawValue && typeof rawValue === 'object' && 'val' in rawValue) {
                paramValue = ParameterValue.fromJson(rawValue);
            } else {
                paramValue = ParameterValue.fromPlainValue(rawValue);
            }

            if (stateKeys.includes(key) || stateKeys.some(k => key.startsWith(k))) {
                state.set(key, paramValue);
            } else if (personaKeys.includes(key) || personaKeys.some(k => key.startsWith(k))) {
                persona.set(key, paramValue);
            } else {
                parameter.set(key, paramValue);
            }
        }
    }
}

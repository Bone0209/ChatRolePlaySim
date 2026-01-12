/**
 * GameEntity - ゲーム内のエンティティ（プレイヤー、NPC等）を表すドメインエンティティ
 * 
 * EntityはPersona（性格）、Parameter（能力値）、State（状態）の3つのカテゴリに
 * 分かれたパラメータを持ちます。
 */

import { ParameterValue, Visibility } from '../value-objects';

/** エンティティの種類 */
export type EntityType = 'ENTITY_PLAYER' | 'ENTITY_NPC';

/** パラメータマップの型定義 */
export type ParameterMap = Map<string, ParameterValue<unknown>>;

/**
 * ゲームエンティティ
 * プレイヤーやNPCを表す。各パラメータはカテゴリごとにMapで管理される。
 */
export class GameEntity {
    private readonly _id: string;
    private readonly _worldId: string;
    private readonly _type: EntityType;
    private readonly _name: string;
    private readonly _description: string;
    private readonly _createdAt: Date;

    // パラメータはカテゴリごとに分離して管理
    private _persona: ParameterMap;
    private _parameter: ParameterMap;
    private _state: ParameterMap;

    private constructor(
        id: string,
        worldId: string,
        type: EntityType,
        name: string,
        description: string,
        createdAt: Date,
        persona: ParameterMap,
        parameter: ParameterMap,
        state: ParameterMap
    ) {
        this._id = id;
        this._worldId = worldId;
        this._type = type;
        this._name = name;
        this._description = description;
        this._createdAt = createdAt;
        this._persona = persona;
        this._parameter = parameter;
        this._state = state;
    }

    /**
     * 新しいエンティティを作成
     */
    static create(params: {
        id: string;
        worldId: string;
        type: EntityType;
        name: string;
        description?: string;
        persona?: ParameterMap;
        parameter?: ParameterMap;
        state?: ParameterMap;
    }): GameEntity {
        return new GameEntity(
            params.id,
            params.worldId,
            params.type,
            params.name,
            params.description ?? '',
            new Date(),
            params.persona ?? new Map(),
            params.parameter ?? new Map(),
            params.state ?? new Map()
        );
    }

    /**
     * 既存のエンティティを復元（リポジトリから読み込む際に使用）
     */
    static reconstruct(params: {
        id: string;
        worldId: string;
        type: EntityType;
        name: string;
        description: string;
        createdAt: Date;
        persona: ParameterMap;
        parameter: ParameterMap;
        state: ParameterMap;
    }): GameEntity {
        return new GameEntity(
            params.id,
            params.worldId,
            params.type,
            params.name,
            params.description,
            params.createdAt,
            params.persona,
            params.parameter,
            params.state
        );
    }

    // --- Getters ---

    get id(): string { return this._id; }
    get worldId(): string { return this._worldId; }
    get type(): EntityType { return this._type; }
    get name(): string { return this._name; }
    get description(): string { return this._description; }
    get createdAt(): Date { return this._createdAt; }

    get persona(): ParameterMap { return new Map(this._persona); }
    get parameter(): ParameterMap { return new Map(this._parameter); }
    get state(): ParameterMap { return new Map(this._state); }

    // --- Business Logic Methods ---

    /**
     * プレイヤーかどうか
     */
    isPlayer(): boolean {
        return this._type === 'ENTITY_PLAYER';
    }

    /**
     * NPCかどうか
     */
    isNpc(): boolean {
        return this._type === 'ENTITY_NPC';
    }

    /**
     * 好感度を取得（なければ初期値0を返す）
     */
    getAffection(): number {
        const affection = this._state.get('affection');
        if (affection) {
            return affection.value as number;
        }
        return 0;
    }

    /**
     * 現在地を取得
     */
    getLocation(): string {
        const location = this._state.get('location');
        if (location) {
            return location.value as string;
        }
        return 'Unknown';
    }

    /**
     * 現在地IDを取得
     */
    getLocationId(): string {
        const locationId = this._state.get('locationId');
        if (locationId) {
            return locationId.value as string;
        }
        return '';
    }

    /**
     * Stateパラメータを更新（新しいエンティティを返す）
     */
    updateState(key: string, value: ParameterValue<unknown>): GameEntity {
        const newState = new Map(this._state);
        newState.set(key, value);

        return new GameEntity(
            this._id,
            this._worldId,
            this._type,
            this._name,
            this._description,
            this._createdAt,
            this._persona,
            this._parameter,
            newState
        );
    }

    /**
     * 好感度を更新（新しいエンティティを返す）
     */
    updateAffection(newValue: number): GameEntity {
        const affectionParam = ParameterValue.create(newValue, Visibility.private());
        return this.updateState('affection', affectionParam);
    }

    /**
     * 指定したキーのパラメータ値を取得（全カテゴリから検索）
     */
    getParameterValue(key: string): unknown | undefined {
        // 検索順序: state -> persona -> parameter
        const stateVal = this._state.get(key);
        if (stateVal) return stateVal.value;

        const personaVal = this._persona.get(key);
        if (personaVal) return personaVal.value;

        const paramVal = this._parameter.get(key);
        if (paramVal) return paramVal.value;

        return undefined;
    }

    /**
     * 公開されているパラメータのみを取得
     */
    getPublicParameters(): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        const addPublic = (map: ParameterMap) => {
            map.forEach((param, key) => {
                if (param.isPublic()) {
                    result[key] = param.value;
                }
            });
        };

        addPublic(this._state);
        addPublic(this._persona);
        addPublic(this._parameter);

        return result;
    }

    /**
     * すべてのパラメータをフラットなオブジェクトとして取得
     */
    getAllParameters(): Record<string, { val: unknown; vis: string }> {
        const result: Record<string, { val: unknown; vis: string }> = {};

        const addAll = (map: ParameterMap) => {
            map.forEach((param, key) => {
                result[key] = param.toJson();
            });
        };

        addAll(this._state);
        addAll(this._persona);
        addAll(this._parameter);

        return result;
    }
}

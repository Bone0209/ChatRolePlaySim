/**
 * Location - ゲーム内の場所を表すドメインエンティティ
 */

export class Location {
    private readonly _id: string;
    private readonly _worldId: string;
    private readonly _name: string;
    private readonly _description: string;
    private readonly _createdAt: Date;
    private readonly _attributes: Map<string, string>;

    private constructor(
        id: string,
        worldId: string,
        name: string,
        description: string,
        createdAt: Date,
        attributes: Map<string, string>
    ) {
        this._id = id;
        this._worldId = worldId;
        this._name = name;
        this._description = description;
        this._createdAt = createdAt;
        this._attributes = attributes;
    }

    /**
     * 新しいロケーションを作成
     */
    static create(params: {
        id: string;
        worldId: string;
        name: string;
        description?: string;
        attributes?: Map<string, string>;
    }): Location {
        return new Location(
            params.id,
            params.worldId,
            params.name,
            params.description ?? '',
            new Date(),
            params.attributes ?? new Map()
        );
    }

    /**
     * 既存のロケーションを復元
     */
    static reconstruct(params: {
        id: string;
        worldId: string;
        name: string;
        description: string;
        createdAt: Date;
        attributes: Map<string, string>;
    }): Location {
        return new Location(
            params.id,
            params.worldId,
            params.name,
            params.description,
            params.createdAt,
            params.attributes
        );
    }

    // --- Getters ---

    get id(): string { return this._id; }
    get worldId(): string { return this._worldId; }
    get name(): string { return this._name; }
    get description(): string { return this._description; }
    get createdAt(): Date { return this._createdAt; }
    get attributes(): Map<string, string> { return new Map(this._attributes); }

    // --- Methods ---

    /**
     * 基本情報を更新（新しいインスタンスを返す）
     */
    updateInfo(name: string, description: string): Location {
        return new Location(
            this._id,
            this._worldId,
            name,
            description,
            this._createdAt,
            this._attributes
        );
    }

    /**
     * 属性を更新（新しいインスタンスを返す）
     */
    updateAttribute(key: string, value: string): Location {
        const newAttributes = new Map(this._attributes);
        newAttributes.set(key, value);

        return new Location(
            this._id,
            this._worldId,
            this._name,
            this._description,
            this._createdAt,
            newAttributes
        );
    }

    /**
     * 属性を取得
     */
    getAttribute(key: string): string | undefined {
        return this._attributes.get(key);
    }

    /**
     * 全属性を取得
     */
    getAllAttributes(): Map<string, string> {
        return new Map(this._attributes);
    }
}

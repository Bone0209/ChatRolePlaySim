/**
 * World Entity - ゲームワールドを表すドメインエンティティ
 * 
 * ワールドはゲームの舞台であり、複数のEntityとチャットを含みます。
 */

/**
 * ワールドエンティティ
 * 一意のIDによって識別されるエンティティ
 */
export class World {
    private readonly _id: string;
    private readonly _name: string;
    private readonly _prompt: string;
    private readonly _createdAt: Date;

    private constructor(
        id: string,
        name: string,
        prompt: string,
        createdAt: Date
    ) {
        this._id = id;
        this._name = name;
        this._prompt = prompt;
        this._createdAt = createdAt;
    }

    /**
     * 新しいワールドを作成
     */
    static create(params: {
        id: string;
        name: string;
        prompt: string;
        createdAt?: Date;
    }): World {
        return new World(
            params.id,
            params.name,
            params.prompt,
            params.createdAt ?? new Date()
        );
    }

    /**
     * 既存のワールドを復元（リポジトリから読み込む際に使用）
     */
    static reconstruct(params: {
        id: string;
        name: string;
        prompt: string;
        createdAt: Date;
    }): World {
        return new World(
            params.id,
            params.name,
            params.prompt,
            params.createdAt
        );
    }

    // --- Getters ---

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get prompt(): string {
        return this._prompt;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    // --- Business Methods ---

    /**
     * ワールドの表示用サマリーを取得
     */
    getSummary(): string {
        return `${this._name} (Created: ${this._createdAt.toLocaleDateString()})`;
    }
}

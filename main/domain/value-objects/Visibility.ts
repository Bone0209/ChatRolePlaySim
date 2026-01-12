/**
 * Visibility - 値オブジェクトの可視性を表す型
 * 
 * データがプレイヤーに公開されているか、非公開かを示します。
 */

/** 可視性の種類 */
export type VisibilityType = 'vis_public' | 'vis_private';

/**
 * 可視性を表すValue Object
 * 不変（Immutable）であり、新しい値が必要な場合は新しいインスタンスを作成します。
 */
export class Visibility {
    private readonly _value: VisibilityType;

    private constructor(value: VisibilityType) {
        this._value = value;
    }

    /** 公開可視性を作成 */
    static public(): Visibility {
        return new Visibility('vis_public');
    }

    /** 非公開可視性を作成 */
    static private(): Visibility {
        return new Visibility('vis_private');
    }

    /** 文字列から可視性を作成 */
    static fromString(value: string): Visibility {
        if (value === 'vis_public' || value === true as unknown) {
            return Visibility.public();
        }
        return Visibility.private();
    }

    /** 可視性の値を取得 */
    get value(): VisibilityType {
        return this._value;
    }

    /** 公開かどうか */
    isPublic(): boolean {
        return this._value === 'vis_public';
    }

    /** 非公開かどうか */
    isPrivate(): boolean {
        return this._value === 'vis_private';
    }

    /** 文字列表現 */
    toString(): string {
        return this._value;
    }

    /** 等価性の比較 */
    equals(other: Visibility): boolean {
        return this._value === other._value;
    }
}

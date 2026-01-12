/**
 * ParameterValue - パラメータの値と可視性を持つ値オブジェクト
 * 
 * すべてのEntityのパラメータ（好感度、HP、性格など）はこの形式で管理されます。
 * データベースの { val, vis } 構造に対応しています。
 */

import { Visibility, VisibilityType } from './Visibility';

/**
 * パラメータ値を表すValue Object
 * 不変（Immutable）であり、値を変更するには新しいインスタンスを作成します。
 * 
 * @template T パラメータの値の型（number, string, boolean など）
 */
export class ParameterValue<T> {
    private readonly _value: T;
    private readonly _visibility: Visibility;

    private constructor(value: T, visibility: Visibility) {
        this._value = value;
        this._visibility = visibility;
    }

    /**
     * 新しいParameterValueを作成
     * @param value 値
     * @param visibility 可視性（デフォルトは非公開）
     */
    static create<T>(value: T, visibility: Visibility = Visibility.private()): ParameterValue<T> {
        return new ParameterValue(value, visibility);
    }

    /**
     * データベースのJSON形式からParameterValueを作成
     * @param data { val: T, vis: string } 形式のオブジェクト
     */
    static fromJson<T>(data: { val: T; vis: string | boolean }): ParameterValue<T> {
        const visibility = Visibility.fromString(String(data.vis));
        return new ParameterValue(data.val, visibility);
    }

    /**
     * プレーンな値からParameterValueを作成（レガシーデータ対応）
     * 可視性情報がない場合は非公開として扱う
     */
    static fromPlainValue<T>(value: T): ParameterValue<T> {
        return new ParameterValue(value, Visibility.private());
    }

    /** 値を取得 */
    get value(): T {
        return this._value;
    }

    /** 可視性を取得 */
    get visibility(): Visibility {
        return this._visibility;
    }

    /** 公開されているかどうか */
    isPublic(): boolean {
        return this._visibility.isPublic();
    }

    /**
     * 新しい値で更新したParameterValueを作成（不変性を維持）
     * @param newValue 新しい値
     */
    withValue(newValue: T): ParameterValue<T> {
        return new ParameterValue(newValue, this._visibility);
    }

    /**
     * 新しい可視性で更新したParameterValueを作成（不変性を維持）
     * @param newVisibility 新しい可視性
     */
    withVisibility(newVisibility: Visibility): ParameterValue<T> {
        return new ParameterValue(this._value, newVisibility);
    }

    /**
     * データベース保存用のJSON形式に変換
     */
    toJson(): { val: T; vis: VisibilityType } {
        return {
            val: this._value,
            vis: this._visibility.value
        };
    }

    /** 等価性の比較 */
    equals(other: ParameterValue<T>): boolean {
        return this._value === other._value && this._visibility.equals(other._visibility);
    }

    /** 文字列表現（デバッグ用） */
    toString(): string {
        return `ParameterValue(${this._value}, ${this._visibility})`;
    }
}

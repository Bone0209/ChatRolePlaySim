/**
 * IUserProfileRepository - ユーザープロファイルリポジトリのインターフェース
 */

export interface UserProfileListDto {
    id: number;
    profileName: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserProfileDto {
    listId: number;
    keyName: string;
    keyValue: string;
    valueType: string;
}

export interface UserSettingDto {
    keyName: string;
    keyValue: string;
    valueType: string;
}

export interface IUserProfileRepository {
    getProfileList(): Promise<UserProfileListDto[]>;
    createProfile(name: string): Promise<UserProfileListDto>;
    getProfileSettings(listId: number): Promise<UserProfileDto[]>;
    updateProfileSetting(listId: number, keyName: string, keyValue: string, valueType: string): Promise<UserProfileDto>;
    deleteProfile(id: number): Promise<void>;
    deleteProfileSetting(listId: number, keyName: string): Promise<void>;
    getGlobalSettings(): Promise<UserSettingDto[]>;
    updateGlobalSetting(keyName: string, keyValue: string, valueType: string): Promise<UserSettingDto>;
    getGlobalSetting(keyName: string): Promise<UserSettingDto | null>;
}

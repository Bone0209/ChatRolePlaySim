import prisma from '../database/prisma';
import { EncryptionService } from '../security/EncryptionService';
import { IUserProfileRepository, UserProfileListDto, UserProfileDto, UserSettingDto } from '../../domain/repositories/IUserProfileRepository';

export class PrismaUserProfileRepository implements IUserProfileRepository {
    private encryptionService: EncryptionService;

    constructor() {
        this.encryptionService = new EncryptionService();
    }

    async getProfileList(): Promise<UserProfileListDto[]> {
        return await (prisma as any).tUserProfileList.findMany({
            orderBy: { id: 'asc' },
        });
    }

    async createProfile(name: string): Promise<UserProfileListDto> {
        // Create the profile list entry
        const profile = await (prisma as any).tUserProfileList.create({
            data: {
                profileName: name,
            },
        });

        return profile;
    }

    async getProfileSettings(listId: number): Promise<UserProfileDto[]> {
        return await (prisma as any).tUserProfile.findMany({
            where: { listId },
        });
    }

    async updateProfileSetting(listId: number, keyName: string, keyValue: string, valueType: string): Promise<UserProfileDto> {
        return await (prisma as any).tUserProfile.upsert({
            where: {
                listId_keyName: { listId, keyName },
            },
            create: {
                listId,
                keyName,
                keyValue,
                valueType,
            },
            update: {
                keyValue,
                valueType,
            },
        });
    }

    async deleteProfile(id: number): Promise<void> {
        await (prisma as any).tUserProfileList.delete({
            where: { id },
        });
    }

    async deleteProfileSetting(listId: number, keyName: string): Promise<void> {
        await (prisma as any).tUserProfile.delete({
            where: {
                listId_keyName: { listId, keyName },
            },
        });
    }

    async getGlobalSettings(): Promise<UserSettingDto[]> {
        const settings = await (prisma as any).tUserSetting.findMany();
        return settings.map((s: any) => {
            if (s.keyName.endsWith('.api_key') && s.keyValue) {
                // Try catch decrypt just in case
                try {
                    return { ...s, keyValue: this.encryptionService.decrypt(s.keyValue) };
                } catch (e) {
                    return s;
                }
            }
            return s;
        });
    }

    async updateGlobalSetting(keyName: string, keyValue: string, valueType: string): Promise<UserSettingDto> {
        let saveValue = keyValue;
        if (keyName.endsWith('.api_key') && keyValue) {
            saveValue = this.encryptionService.encrypt(keyValue);
        }

        return await (prisma as any).tUserSetting.upsert({
            where: {
                keyName: keyName,
            },
            create: {
                keyName: keyName,
                keyValue: saveValue,
                valueType: valueType,
            },
            update: {
                keyValue: saveValue,
                valueType: valueType,
            },
        });
    }

    async getGlobalSetting(keyName: string): Promise<UserSettingDto | null> {
        const setting = await (prisma as any).tUserSetting.findUnique({
            where: { keyName },
        });
        if (setting && setting.keyName.endsWith('.api_key') && setting.keyValue) {
            try {
                return { ...setting, keyValue: this.encryptionService.decrypt(setting.keyValue) };
            } catch (e) {
                return setting;
            }
        }
        return setting;
    }
}

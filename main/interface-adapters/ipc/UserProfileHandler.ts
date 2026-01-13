
import { ipcMain } from 'electron';
import { GetProfileListUseCase } from '../../application/usecases/profile/GetProfileListUseCase';
import { CreateProfileUseCase } from '../../application/usecases/profile/CreateProfileUseCase';
import { SwitchProfileUseCase } from '../../application/usecases/profile/SwitchProfileUseCase';
import { GetProfileSettingsUseCase } from '../../application/usecases/profile/GetProfileSettingsUseCase';
import { UpdateProfileSettingUseCase } from '../../application/usecases/profile/UpdateProfileSettingUseCase';
import { GetGlobalSettingsUseCase } from '../../application/usecases/profile/GetGlobalSettingsUseCase';
import { UpdateGlobalSettingUseCase } from '../../application/usecases/profile/UpdateGlobalSettingUseCase';
import { InitializeGlobalSettingsUseCase } from '../../application/usecases/profile/InitializeGlobalSettingsUseCase';
import { PrismaUserProfileRepository } from '../../infrastructure/repositories/PrismaUserProfileRepository';

import { DeleteProfileUseCase } from '../../application/usecases/profile/DeleteProfileUseCase';
import { DeleteProfileSettingUseCase } from '../../application/usecases/profile/DeleteProfileSettingUseCase';
import { TestConnectionUseCase } from '../../application/usecases/profile/TestConnectionUseCase';

export class UserProfileHandler {
    constructor(
        private getProfileListUseCase: GetProfileListUseCase,
        private createProfileUseCase: CreateProfileUseCase,
        private switchProfileUseCase: SwitchProfileUseCase,
        private getProfileSettingsUseCase: GetProfileSettingsUseCase,
        private updateProfileSettingUseCase: UpdateProfileSettingUseCase,
        private getGlobalSettingsUseCase: GetGlobalSettingsUseCase,
        private updateGlobalSettingUseCase: UpdateGlobalSettingUseCase,
        private initializeGlobalSettingsUseCase: InitializeGlobalSettingsUseCase,
        private deleteProfileUseCase: DeleteProfileUseCase,
        private deleteProfileSettingUseCase: DeleteProfileSettingUseCase,
        private testConnectionUseCase: TestConnectionUseCase
    ) { }

    register() {
        ipcMain.handle('profile:list', async () => {
            // Ensure defaults exist when listing (safe place to init)
            await this.initializeGlobalSettingsUseCase.execute();

            let list = await this.getProfileListUseCase.execute();
            if (list.profiles.length === 0) {
                // Auto-create default profile if none exists
                await this.createProfileUseCase.execute("Default");
                list = await this.getProfileListUseCase.execute();
            }
            return list;
        });

        ipcMain.handle('profile:create', async (_, name: string) => {
            return await this.createProfileUseCase.execute(name);
        });

        ipcMain.handle('profile:switch', async (_, id: number) => {
            return await this.switchProfileUseCase.execute(id);
        });

        ipcMain.handle('profile:get-settings', async (_, id: number) => {
            return await this.getProfileSettingsUseCase.execute(id);
        });

        ipcMain.handle('profile:update-setting', async (_, { id, key, value, type }) => {
            return await this.updateProfileSettingUseCase.execute(id, key, value, type);
        });

        ipcMain.handle('profile:get-global-settings', async () => {
            const settings = await this.getGlobalSettingsUseCase.execute();
            // Mask API Keys for UI
            return settings.map((s: any) => {
                if (s.keyName.endsWith('.api_key') && s.keyValue) {
                    return { ...s, keyValue: '(Configured)' };
                }
                return s;
            });
        });

        ipcMain.handle('profile:update-global-setting', async (_, { key, value, type }) => {
            return await this.updateGlobalSettingUseCase.execute(key, value, type);
        });

        ipcMain.handle('profile:delete', async (_, id: number) => {
            return await this.deleteProfileUseCase.execute(id);
        });

        ipcMain.handle('profile:delete-setting', async (_, { id, key }) => {
            return await this.deleteProfileSettingUseCase.execute(id, key);
        });

        ipcMain.handle('profile:test-connection', async (_, target: 'first' | 'second') => {
            return await this.testConnectionUseCase.execute(target);
        });
    }
}

export const setupUserProfileHandlers = () => {
    const repo = new PrismaUserProfileRepository();
    const handler = new UserProfileHandler(
        new GetProfileListUseCase(repo),
        new CreateProfileUseCase(repo),
        new SwitchProfileUseCase(repo),
        new GetProfileSettingsUseCase(repo),
        new UpdateProfileSettingUseCase(repo),
        new GetGlobalSettingsUseCase(repo),
        new UpdateGlobalSettingUseCase(repo),
        new InitializeGlobalSettingsUseCase(repo),
        new DeleteProfileUseCase(repo),
        new DeleteProfileSettingUseCase(repo),
        new TestConnectionUseCase(repo)
    );
    handler.register();
};

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    launchChat: (worldId: string) => ipcRenderer.send('launch-chat', worldId),
    openInventory: () => ipcRenderer.send('open-inventory'),
    openStatus: () => ipcRenderer.send('open-status'),
    chat: (message: string, history: any[], targetId?: string, worldId?: string) => ipcRenderer.invoke('chat', { message, history, targetId, worldId }),
    worldList: () => ipcRenderer.invoke('world:list'),
    worldGet: (id: string) => ipcRenderer.invoke('world:get', id),
    worldCreate: (data: { name: string, prompt: string, entities?: any[] }) => ipcRenderer.invoke('world:create', data),
    worldGenerate: (data: { type: 'title' | 'description', context: string }) => ipcRenderer.invoke('world:generate', data),
    locationCreate: (data: any) => ipcRenderer.invoke('location:create', data),
    game: {
        processAction: (mode: string, content: string, worldId: string) => ipcRenderer.invoke('game:process-action', { mode, content, worldId }),
        getState: (worldId: string) => ipcRenderer.invoke('game:get-state', worldId),
        getChatHistory: (worldId: string) => ipcRenderer.invoke('chat:get-history', worldId), // Updated path if needed, keeping consistency
        getEntity: (entityId: string) => ipcRenderer.invoke('game:get-entity', entityId),
        getLocationEntities: (worldId: string, locationId: string) => ipcRenderer.invoke('game:get-location-entities', { worldId, locationId }),
        entityCreate: (data: any) => ipcRenderer.invoke('entity:create', data),
    },
    profile: {
        list: () => ipcRenderer.invoke('profile:list'),
        create: (name: string) => ipcRenderer.invoke('profile:create', name),
        switch: (id: number) => ipcRenderer.invoke('profile:switch', id),
        getSettings: (id: number) => ipcRenderer.invoke('profile:get-settings', id),
        updateSetting: (data: { id: number, key: string, value: string, type: string }) => ipcRenderer.invoke('profile:update-setting', data),
        getGlobalSettings: () => ipcRenderer.invoke('profile:get-global-settings'),
        updateGlobalSetting: (data: { key: string, value: string, type: string }) => ipcRenderer.invoke('profile:update-global-setting', data),
        delete: (id: number) => ipcRenderer.invoke('profile:delete', id),
        deleteSetting: (data: { id: number, key: string }) => ipcRenderer.invoke('profile:delete-setting', data),
        testConnection: (target: 'first' | 'second') => ipcRenderer.invoke('profile:test-connection', target),
    }
});



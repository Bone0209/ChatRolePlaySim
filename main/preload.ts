import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    launchChat: (worldId: string) => ipcRenderer.send('launch-chat', worldId),
    openInventory: () => ipcRenderer.send('open-inventory'),
    openStatus: () => ipcRenderer.send('open-status'),
    chat: (message: string, history: any[], targetId?: string, worldId?: string) => ipcRenderer.invoke('chat', { message, history, targetId, worldId }),
    worldList: () => ipcRenderer.invoke('world:list'),
    worldCreate: (data: { name: string, prompt: string, npcList?: any[] }) => ipcRenderer.invoke('world:create', data),
    worldGenerate: (data: { type: 'title' | 'description', context: string }) => ipcRenderer.invoke('world:generate', data),
    game: {
        processAction: (mode: string, content: string, worldId: string) => ipcRenderer.invoke('game:process-action', { mode, content, worldId }),
        getState: (worldId: string) => ipcRenderer.invoke('game:get-state', worldId),
        getChatHistory: (worldId: string) => ipcRenderer.invoke('game:get-chat-history', worldId),
        getEntity: (entityId: string) => ipcRenderer.invoke('game:get-entity', entityId),
    }
});

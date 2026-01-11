
export { };

declare global {
    interface WorldData {
        id: string;
        name: string;
        prompt: string;
        description?: string;
        createdAt?: string | Date;
    }

    interface NpcProperty<T = any> {
        value: T;
        visible: boolean;
        category: 'basic' | 'persona' | 'parameter' | 'state';
    }

    interface NpcEnvironment {
        [key: string]: NpcProperty | any;
    }

    interface Window {
        electron?: {
            launchChat: (worldId: string) => void;
            openInventory: () => void;
            openStatus: () => void;
            chat: (message: string, history: Array<{ role: string, content: string }>, targetId?: string, worldId?: string) => Promise<string>;
            worldList: () => Promise<WorldData[]>;
            worldCreate: (data: { name: string, prompt: string, npcList?: any[] }) => Promise<WorldData>;
            worldGenerate: (data: { type: 'title' | 'description' | 'npc', context: string }) => Promise<string>;
            game: {
                processAction: (mode: string, content: string, worldId: string) => Promise<any>;
                getState: (worldId: string) => Promise<any>;
                getChatHistory: (worldId: string) => Promise<any[]>;
                getEntity: (entityId: string) => Promise<any>;
            };
        };
    }
}


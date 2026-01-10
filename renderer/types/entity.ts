export type EntityType = 'ENTITY_WORLD' | 'ENTITY_PLAYER' | 'ENTITY_NPC' | 'ENTITY_LOCATION';

export interface BaseEntityEnvironment {
    [key: string]: unknown;
}

// 1. World Environment
export interface WorldEnvironment extends BaseEntityEnvironment {
    turn: number;
    weather: string;
    turns_per_day: number;
    year: number;
    month: number;
    day: number;
}

// Sub-interfaces for Player Environment
export interface AttributeStats {
    base: number;
    effective: number;
    [key: string]: unknown;
}

export interface ResourceStats {
    current: number;
    max: number;
}

export interface PlayerParameters {
    attributes: {
        VIT: AttributeStats;
        DEX: AttributeStats;
        LUCK: AttributeStats;
        [key: string]: AttributeStats;
    };
    resources: {
        hp: ResourceStats;
        mp: ResourceStats;
        [key: string]: ResourceStats;
    };
    stats?: Record<string, unknown>;
}

// 2. Player Environment
export interface PlayerEnvironment extends BaseEntityEnvironment {
    condition: string;
    location: string;
    parameter: PlayerParameters;
}

// 3. NPC Environment
export interface NpcEnvironment extends BaseEntityEnvironment {
    hp: number;
    max_hp: number;
    role: string;
    dialogue_state: string;
    locationId?: string; // Link to Location Entity
    profile?: {
        name: string;
        age: string;
        gender: string;
        race?: string;
        job?: string;
        personality: string;
        physique: string;
        catchphrase: string;
        background?: string;
    };
}

// 4. Location Environment
export interface LocationEnvironment extends BaseEntityEnvironment {
    name: string;
    description: string;
    type: string; // e.g. "Town", "Dungeon", "Field"
    region?: string;
}

export type EntityEnvironment = WorldEnvironment | PlayerEnvironment | NpcEnvironment | LocationEnvironment;

export interface EntityData {
    id: string;
    worldId: string;
    type: EntityType;
    name: string;
    description?: string;
    environment: EntityEnvironment;
    createdAt: Date | string;
    updatedAt: Date | string;
}

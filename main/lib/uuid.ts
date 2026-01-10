import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4 as a String
 */
export const generateId = (): string => {
    return uuidv4();
};

// Deprecated or identity functions for compatibility
export const toId = (uuidStr: string): string => uuidStr;
export const fromId = (id: string): string => id;

/**
 * uuid.ts - UUID生成ユーティリティ
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 新しいUUID v4を生成
 */
export const generateId = (): string => {
    return uuidv4();
};

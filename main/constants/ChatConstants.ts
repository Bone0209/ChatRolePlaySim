/**
 * Chat Constants
 * 定数定義 (Code Level)
 */

// チャットレスポンスの種別
export const CHAT_RESPONSE_TYPE = {
    CHAT: 'C',  // キャラクターの会話
    INFO: 'I',  // システムログ、情報表示
    EVENT: 'E', // イベント発生通知
} as const;

export type ChatResponseType = typeof CHAT_RESPONSE_TYPE[keyof typeof CHAT_RESPONSE_TYPE];


// チャットメッセージ内のXMLタグ
export const CHAT_TAG = {
    EMO: 'emo', // 感情キー
    ACT: 'act', // キャラクターの動作
    MSG: 'msg', // 発言内容
} as const;

export type ChatTag = typeof CHAT_TAG[keyof typeof CHAT_TAG];

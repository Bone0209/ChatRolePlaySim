
import { safeStorage } from 'electron';

export class EncryptionService {
    isAvailable(): boolean {
        return safeStorage.isEncryptionAvailable();
    }

    encrypt(text: string): string {
        if (!text) return '';
        if (!this.isAvailable()) {
            console.warn('Encryption is not available. Saving in plain text (NOT SECURE).');
            return text; // Fallback for dev/unsupported envs
        }
        try {
            const buffer = safeStorage.encryptString(text);
            return buffer.toString('base64');
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    decrypt(encryptedText: string): string {
        if (!encryptedText) return '';
        if (!this.isAvailable()) {
            return encryptedText; // Fallback
        }
        try {
            const buffer = Buffer.from(encryptedText, 'base64');
            return safeStorage.decryptString(buffer);
        } catch (error) {
            // If decryption fails (e.g. was plain text), assume plain text
            // helpful during migration or if safeStorage key changed
            try {
                return encryptedText;
            } catch (e) {
                console.error('Decryption failed:', error);
                return '';
            }
        }
    }
}

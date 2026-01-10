import fs from 'fs';
import path from 'path';

export class PromptTemplate {
    private templateContent: string;

    constructor(filePath: string) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Template file not found at: ${filePath}`);
        }
        this.templateContent = fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * Substitutes placeholders in the template with provided values.
     * - Objects and Arrays are automatically JSON stringified.
     * - Strings are inserted as is.
     * 
     * @param variables Key-value pairs matching {{key}} in the template.
     * @returns The processed string.
     */
    public render(variables: Record<string, any>): string {
        let result = this.templateContent;

        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            let replacement = '';

            if (typeof value === 'object' && value !== null) {
                // Pretty print JSON objects/arrays
                replacement = JSON.stringify(value, null, 2);
            } else {
                // Convert numbers, booleans, etc to string
                replacement = String(value);
            }

            // Replace all occurrences
            result = result.split(placeholder).join(replacement);
        }

        return result;
    }
}

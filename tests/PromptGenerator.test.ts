import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import mustache from 'mustache';

describe('PromptTemplate', () => {
    const promptPath = path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md');

    it('should load and render user_prompt.md correctly', () => {
        const template = fs.readFileSync(promptPath, 'utf-8');

        const view = {
            worldTime: '12:00',
            location: 'Town Square',
            weather: 'Sunny',
            playerName: 'Kirito',
            playerGender: 'Male',
            playerCondition: 'Healthy',
            playerDescription: 'A black swordsman.',
            targetName: 'Asuna',
            targetProfile: 'A skilled fencer.',
            targetFirstPerson: 'I',
            targetEnding: 'yo',
            conversationHistory: '[speech:Kirito] Hello',
            userInput: 'Hi there',
            actionAnalysis: 'Greeting'
        };

        const result = mustache.render(template, view);

        // Check availability of key sections
        assert.ok(result.includes('12:00'), 'World Time should be rendered');
        assert.ok(result.includes('Town Square'), 'Location should be rendered');
        assert.ok(result.includes('Kirito'), 'Player Name should be rendered');
        assert.ok(result.includes('Asuna'), 'Target Name should be rendered');

        // Check formatting instructions
        assert.ok(result.includes('[narrative]'), 'Instruction for [narrative] should exist');
        assert.ok(result.includes('[speech:Name]'), 'Instruction for [speech] should exist');

        // Check example rendering (mustache variables inside example should also be rendered if they match view keys)
        // In the template, [speech:{{targetName}}] is used in example.
        assert.ok(result.includes('[speech:Asuna]'), 'Example speech tag should be rendered with targetName');
    });

    it('should handle nested objects and key-value iterations', () => {
        const template = `
Start
{{#settings}}
Theme: {{theme}}
{{/settings}}
Attributes:
{{#attributes}}
- {{key}}: {{value}}
{{/attributes}}
Nested Prompt:
{{{nestedPrompt}}}
End`;

        const view = {
            settings: {
                theme: 'Dark'
            },
            attributes: [
                { key: 'STR', value: 10 },
                { key: 'DEX', value: 14 }
            ],
            // Simulating a nested prompt or sub-template that might contain tags
            nestedPrompt: '[narrative] This is a nested story segment.'
        };

        const result = mustache.render(template, view);

        assert.ok(result.includes('Theme: Dark'), 'Should render nested object properties via section or dot notation');
        assert.ok(result.includes('- STR: 10'), 'Should render key-value list item 1');
        assert.ok(result.includes('- DEX: 14'), 'Should render key-value list item 2');
        assert.ok(result.includes('[narrative] This is a nested story segment.'), 'Should render unescaped nested strings');
    });

    it('should render markdown tables passed as variables', () => {
        const template = fs.readFileSync(promptPath, 'utf-8');
        const tableData = `| Trait | Value |
| :--- | :--- |
| Strength | High |
| Magic | Low |`;

        const view = {
            worldTime: '12:00',
            location: 'Town',
            weather: 'Clear',
            playerName: 'P1',
            playerGender: 'N/A',
            playerCondition: 'Good',
            playerDescription: 'Desc',
            targetName: 'NPC1',
            targetProfile: tableData, // Passing table as string
            targetFirstPerson: 'I',
            targetEnding: '.',
            conversationHistory: '',
            userInput: '',
            actionAnalysis: ''
        };

        const result = mustache.render(template, view);

        assert.ok(result.includes('| Trait | Value |'), 'Table header should be rendered');
        assert.ok(result.includes('| Strength | High |'), 'Table content should be rendered');
    });
});

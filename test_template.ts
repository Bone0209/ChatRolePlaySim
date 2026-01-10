import path from 'path';
import { PromptTemplate } from './main/lib/PromptTemplate';

const promptPath = path.join(process.cwd(), 'main', 'prompts', 'user_prompt.md');
console.log(`Loading template from: ${promptPath}`);

try {
    const template = new PromptTemplate(promptPath);

    const variables = {
        worldTime: "1024-05-20 12:00:00",
        location: "Forest of Beginnings",
        weather: "Sunny",
        playerName: "Luna",
        playerCondition: "Healthy",
        userInput: "Look around and check my inventory.",
        conversationHistory: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" }
        ]
    };

    console.log("--- Variables ---");
    console.log(JSON.stringify(variables, null, 2));

    const result = template.render(variables);

    console.log("\n--- Rendered Output ---");
    console.log(result);

} catch (error) {
    console.error("Error:", error);
}

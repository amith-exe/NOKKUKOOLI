"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const vscode = __importStar(require("vscode"));
class AgentService {
    outputChannel;
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel("Office Agent");
    }
    /**
     * Checks if GitHub Copilot or another Language Model is available via VS Code LM API.
     */
    async isCopilotAvailable() {
        try {
            if (!vscode.lm || !vscode.lm.selectChatModels) {
                return false;
            }
            let models = await vscode.lm.selectChatModels({ vendor: "copilot" });
            if (!models || models.length === 0) {
                models = await vscode.lm.selectChatModels({ family: "gpt-4o" });
            }
            if (!models || models.length === 0) {
                models = await vscode.lm.selectChatModels();
            }
            return models && models.length > 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Generates clean, production-grade code using the native VS Code Language Model API (GitHub Copilot).
     */
    async generateCode(prompt, languageId) {
        if (!vscode.lm || !vscode.lm.selectChatModels) {
            throw new Error("VS Code Language Model API is not available in this environment.");
        }
        // Locate available Copilot / GPT-4o chat model
        let models = await vscode.lm.selectChatModels({ vendor: "copilot" });
        if (!models || models.length === 0) {
            models = await vscode.lm.selectChatModels({ family: "gpt-4o" });
        }
        if (!models || models.length === 0) {
            models = await vscode.lm.selectChatModels();
        }
        if (!models || models.length === 0) {
            throw new Error("GitHub Copilot is not available. Ensure it is installed and logged in.");
        }
        const model = models[0];
        this.outputChannel.appendLine(`[Office Agent] Selected model: ${model.name} (${model.vendor})`);
        this.outputChannel.appendLine(`[PROMPT] ${prompt} [LANGUAGE: ${languageId}]`);
        const systemInstruction = `You are an automated coding assistant. Write clean, idiomatic, fully functional ${languageId} code for this requirement: "${prompt}".\n` +
            `STRICT RULES:\n` +
            `1. Output ONLY valid, executable ${languageId} code.\n` +
            `2. Do NOT wrap the code in markdown fences (NO \`\`\` or \`\`\`${languageId}).\n` +
            `3. Do NOT include conversational pleasantries, explanations, or comments about the task.\n` +
            `4. Start directly with the first line of code and end with the last line of code.`;
        const messages = [vscode.LanguageModelChatMessage.User(systemInstruction)];
        const cancellationToken = new vscode.CancellationTokenSource().token;
        const response = await model.sendRequest(messages, {}, cancellationToken);
        let rawOutput = "";
        for await (const chunk of response.text) {
            rawOutput += chunk;
        }
        this.outputChannel.appendLine(`[RESPONSE RECEIVED: ${rawOutput.length} characters]`);
        return this.cleanCodeOutput(rawOutput);
    }
    /**
     * Strips any residual markdown fences or leading/trailing whitespace.
     */
    cleanCodeOutput(rawOutput) {
        let code = rawOutput.trim();
        // Strip leading markdown fence ```language or ```
        code = code.replace(/^```[a-zA-Z0-9_-]*\r?\n/, "");
        // Strip trailing markdown fence ```
        code = code.replace(/\r?\n```\s*$/, "");
        // Also handle cases where multiple blocks were emitted
        const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)```/g;
        const matches = [...code.matchAll(codeBlockRegex)];
        if (matches.length > 0) {
            code = matches.map((m) => m[1].trim()).join("\n\n");
        }
        return code + "\n";
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=agentService.js.map
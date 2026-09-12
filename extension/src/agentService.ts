import * as vscode from "vscode";

export class AgentService {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Office Agent");
  }

  /**
   * Checks if GitHub Copilot or another Language Model is available via VS Code LM API.
   */
  public async isCopilotAvailable(): Promise<boolean> {
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
    } catch {
      return false;
    }
  }

  /**
   * Generates clean, production-grade code using the native VS Code Language Model API (GitHub Copilot).
   */
  public async generateCode(
    prompt: string,
    languageId: string,
  ): Promise<string> {
    if (!vscode.lm || !vscode.lm.selectChatModels) {
      throw new Error(
        "VS Code Language Model API is not available in this environment.",
      );
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
      throw new Error(
        "GitHub Copilot is not available. Ensure it is installed and logged in.",
      );
    }

    const model = models[0];
    this.outputChannel.appendLine(
      `[Office Agent] Selected model: ${model.name} (${model.vendor})`,
    );
    this.outputChannel.appendLine(
      `[PROMPT] ${prompt} [LANGUAGE: ${languageId}]`,
    );

    const systemInstruction =
      `You are an automated coding assistant. Write clean, idiomatic, fully functional ${languageId} code for this requirement: "${prompt}".\n` +
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

    this.outputChannel.appendLine(
      `[RESPONSE RECEIVED: ${rawOutput.length} characters]`,
    );

    return this.cleanCodeOutput(rawOutput);
  }

  /**
   * Strips any residual markdown fences or leading/trailing whitespace.
   */
  private cleanCodeOutput(rawOutput: string): string {
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

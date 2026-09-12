import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const SECRET_KEY = "nokkukooli.elevenLabsApiKey";

export class TtsService {
  private outputChannel: vscode.OutputChannel;
  private secrets: vscode.SecretStorage;

  constructor(context?: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel(
      "Office Malayalam TTS",
    );
    this.secrets = context
      ? context.secrets
      : (vscode as any).workspace?.secrets;
  }

  private loadLocalEnvironment(): void {
    if (process.env.ELEVENLABS_API_KEY) {
      return;
    }

    const envPath = path.join(__dirname, "..", ".env.local");
    try {
      const contents = fs.readFileSync(envPath, "utf8");
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
        }
      }
    } catch {
      // Local environment files are optional; SecretStorage and process.env remain available.
    }
  }

  /**
   * Resolves the ElevenLabs API key from SecretStorage, settings, or environment.
   */
  private async resolveApiKeys(): Promise<string[]> {
    const keys: string[] = [];

    try {
      const secretKey = await this.secrets?.get(SECRET_KEY);
      if (secretKey && secretKey.trim() !== "") {
        keys.push(secretKey.trim());
      }
    } catch {
      /* SecretStorage unavailable; fall through */
    }

    this.loadLocalEnvironment();
    const config = vscode.workspace.getConfiguration("nokkukooli");
    const configuredKey = config.get<string>("elevenLabsApiKey");
    if (configuredKey && configuredKey.trim() !== "") {
      keys.push(configuredKey.trim());
    }
    if (
      process.env.ELEVENLABS_API_KEY &&
      process.env.ELEVENLABS_API_KEY.trim() !== ""
    ) {
      keys.push(process.env.ELEVENLABS_API_KEY.trim());
    }

    return [...new Set(keys)];
  }

  /**
   * True if an ElevenLabs API key is configured in any source.
   */
  public async hasApiKey(): Promise<boolean> {
    const keys = await this.resolveApiKeys();
    return keys.some((key) => key !== "PLACEHOLDER_KEY");
  }

  /**
   * Stores the API key in encrypted SecretStorage (preferred method).
   */
  public async setApiKey(key: string): Promise<void> {
    await this.secrets?.store(SECRET_KEY, key.trim());
    this.outputChannel.appendLine(
      "[TTS] ElevenLabs API key stored in SecretStorage.",
    );
  }

  /**
   * Removes the stored API key.
   */
  public async clearApiKey(): Promise<void> {
    try {
      await this.secrets?.delete(SECRET_KEY);
      this.outputChannel.appendLine("[TTS] ElevenLabs API key cleared.");
    } catch {
      /* ignore */
    }
  }

  /**
   * Synthesizes Malayalam speech using ElevenLabs Multilingual V2.
   * Returns a base64 data URI (data:audio/mp3;base64,...) or null if API key is missing/error.
   */
  public async synthesizeMalayalamSpeech(text: string): Promise<string | null> {
    const apiKeys = (await this.resolveApiKeys()).filter(
      (key) => key !== "PLACEHOLDER_KEY",
    );
    // Default to popular expressive voice ID (e.g. Rachel / George / custom)
    const voiceId =
      vscode.workspace
        .getConfiguration("nokkukooli")
        .get<string>("elevenLabsVoiceId") ||
      process.env.ELEVENLABS_VOICE_ID ||
      "ig21FhMpLhIWhUUj9yOX";

    if (apiKeys.length === 0) {
      this.outputChannel.appendLine(
        "[TTS] ElevenLabs API key not set or placeholder. Skipping voice generation.",
      );
      return null;
    }

    try {
      this.outputChannel.appendLine(
        `[TTS] Synthesizing speech with eleven_multilingual_v2 for: "${text.substring(0, 50)}..."`,
      );

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      for (const apiKey of apiKeys) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.2,
              use_speaker_boost: true,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          this.outputChannel.appendLine(
            `[TTS ERROR] Status ${response.status}: ${errText}`,
          );
          if (response.status !== 401 && response.status !== 403) {
            return null;
          }
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString("base64");
        const dataUri = `data:audio/mp3;base64,${base64Audio}`;

        this.outputChannel.appendLine(
          `[TTS SUCCESS] Audio generated (${buffer.length} bytes).`,
        );
        return dataUri;
      }
      return null;
    } catch (err: any) {
      this.outputChannel.appendLine(`[TTS EXCEPTION] ${err.message}`);
      return null;
    }
  }
}

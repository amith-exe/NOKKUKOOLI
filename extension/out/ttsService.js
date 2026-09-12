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
exports.TtsService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SECRET_KEY = "nokkukooli.elevenLabsApiKey";
class TtsService {
    outputChannel;
    secrets;
    constructor(context) {
        this.outputChannel = vscode.window.createOutputChannel("Office Malayalam TTS");
        this.secrets = context
            ? context.secrets
            : vscode.workspace?.secrets;
    }
    loadLocalEnvironment() {
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
        }
        catch {
            // Local environment files are optional; SecretStorage and process.env remain available.
        }
    }
    /**
     * Resolves the ElevenLabs API key from SecretStorage, settings, or environment.
     */
    async resolveApiKeys() {
        const keys = [];
        try {
            const secretKey = await this.secrets?.get(SECRET_KEY);
            if (secretKey && secretKey.trim() !== "") {
                keys.push(secretKey.trim());
            }
        }
        catch {
            /* SecretStorage unavailable; fall through */
        }
        this.loadLocalEnvironment();
        const config = vscode.workspace.getConfiguration("nokkukooli");
        const configuredKey = config.get("elevenLabsApiKey");
        if (configuredKey && configuredKey.trim() !== "") {
            keys.push(configuredKey.trim());
        }
        if (process.env.ELEVENLABS_API_KEY &&
            process.env.ELEVENLABS_API_KEY.trim() !== "") {
            keys.push(process.env.ELEVENLABS_API_KEY.trim());
        }
        return [...new Set(keys)];
    }
    /**
     * True if an ElevenLabs API key is configured in any source.
     */
    async hasApiKey() {
        const keys = await this.resolveApiKeys();
        return keys.some((key) => key !== "PLACEHOLDER_KEY");
    }
    /**
     * Stores the API key in encrypted SecretStorage (preferred method).
     */
    async setApiKey(key) {
        await this.secrets?.store(SECRET_KEY, key.trim());
        this.outputChannel.appendLine("[TTS] ElevenLabs API key stored in SecretStorage.");
    }
    /**
     * Removes the stored API key.
     */
    async clearApiKey() {
        try {
            await this.secrets?.delete(SECRET_KEY);
            this.outputChannel.appendLine("[TTS] ElevenLabs API key cleared.");
        }
        catch {
            /* ignore */
        }
    }
    /**
     * Synthesizes Malayalam speech using ElevenLabs Multilingual V2.
     * Returns a base64 data URI (data:audio/mp3;base64,...) or null if API key is missing/error.
     */
    async synthesizeMalayalamSpeech(text) {
        const apiKeys = (await this.resolveApiKeys()).filter((key) => key !== "PLACEHOLDER_KEY");
        // Default to popular expressive voice ID (e.g. Rachel / George / custom)
        const voiceId = vscode.workspace
            .getConfiguration("nokkukooli")
            .get("elevenLabsVoiceId") ||
            process.env.ELEVENLABS_VOICE_ID ||
            "ig21FhMpLhIWhUUj9yOX";
        if (apiKeys.length === 0) {
            this.outputChannel.appendLine("[TTS] ElevenLabs API key not set or placeholder. Skipping voice generation.");
            return null;
        }
        try {
            this.outputChannel.appendLine(`[TTS] Synthesizing speech with eleven_multilingual_v2 for: "${text.substring(0, 50)}..."`);
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
                    this.outputChannel.appendLine(`[TTS ERROR] Status ${response.status}: ${errText}`);
                    if (response.status !== 401 && response.status !== 403) {
                        return null;
                    }
                    continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Audio = buffer.toString("base64");
                const dataUri = `data:audio/mp3;base64,${base64Audio}`;
                this.outputChannel.appendLine(`[TTS SUCCESS] Audio generated (${buffer.length} bytes).`);
                return dataUri;
            }
            return null;
        }
        catch (err) {
            this.outputChannel.appendLine(`[TTS EXCEPTION] ${err.message}`);
            return null;
        }
    }
}
exports.TtsService = TtsService;
//# sourceMappingURL=ttsService.js.map
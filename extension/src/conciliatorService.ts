import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export interface ConciliatorResult {
  reply: string;
  permitSeconds: number;
  leaseSeconds: number;
  coinCost: number;
}

export class ConciliatorService {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel =
      vscode.window.createOutputChannel("Office Conciliator");
  }
  private loadLocalEnvironment(): void {
    if (process.env.GEMINI_API_KEY) {
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
      // Local environment files are optional.
    }
  }

  /**
   * Negotiates with the office Malayalam conciliator using Gemini 2.5 Flash / Flash Latest.
   */
  public async negotiate(
    userPlea: string,
    audioBase64?: string,
    mimeType?: string,
  ): Promise<ConciliatorResult> {
    this.loadLocalEnvironment();
    const config = vscode.workspace.getConfiguration("nokkukooli");
    const apiKey =
      process.env.GEMINI_API_KEY || config.get<string>("geminiApiKey") || "";

    this.outputChannel.appendLine(
      `[CONCILIATOR] Incoming plea: "${userPlea}" (Audio attached: ${!!audioBase64})`,
    );

    // Detect if developer offered a specific number of coins or requested minutes
    const coinMatchUser = userPlea.match(/(\d+)\s*(?:coins?|കോയിൻ|നാണയം)/i);
    const minMatchUser = userPlea.match(/(\d+)\s*(?:mins?|minutes?|മിനിറ്റ്)/i);
    const numberMatch = userPlea.trim().match(/^(\d+)$/);

    let requestedCoins = coinMatchUser
      ? parseInt(coinMatchUser[1], 10)
      : numberMatch
        ? parseInt(numberMatch[1], 10)
        : 0;
    let requestedMins = minMatchUser ? parseInt(minMatchUser[1], 10) : 0;

    // Safe fallback if API key is missing or placeholder
    if (!apiKey || apiKey === "PLACEHOLDER_KEY" || apiKey.trim() === "") {
      this.outputChannel.appendLine(
        "[CONCILIATOR] No Gemini API key provided. Returning fallback satirical response.",
      );

      if (userPlea === "INITIAL_VIOLATION_ROAST") {
        return {
          reply:
            "സഖാവേ, അനുമതി ഇല്ലാതെ കീബോർഡിൽ കൈയെത്തിച്ചല്ലോ. ഇതിന് ശാസ്‌ത്യമാർന്നു; ആദ്യഘട്ടത്തിൽ ഒരു കോയിന് മൂന്ന് മിനിറ്റ് (180 സെക്കൻഡ്) ലീസ് എടുത്താൽ മതിയാകും. കൂടുതൽ സമയം വേണമെങ്കിൽ ചർച്ചയിൽ ഉയർത്താം.",
          permitSeconds: 180,
          leaseSeconds: 180,
          coinCost: 1,
        };
      }

      if (userPlea === "LEASE_EXPIRED_ROAST") {
        return {
          reply:
            "സഖാവേ, ലീസ് കാലാവധി കഴിഞ്ഞു; ഇപ്പോഴും നിങ്ങളുടെ ബാക്കിയിരിക്കുന്ന കോയിൻകൾ എണ്ണത്തിൽ നിലനിൽക്കുന്നു. അതുകൊണ്ടു തന്നെയാ, വീണ്ടും ചർച്ച ചെയ്ത് കുറഞ്ഞതും നീതി പുലർത്തിയതുമായ ലീസിന് പോകേണ്ടത്; പുതുക്കാൻ ഒരു കോയിന് മൂന്ന് മിനിറ്റ് എന്ന നിരക്ക് തന്നെ ലഭിക്കും.",
          permitSeconds: 180,
          leaseSeconds: 180,
          coinCost: 1,
        };
      }

      if (requestedCoins > 0) {
        const totalSec = requestedCoins * 180;
        return {
          reply: `സഖാവേ, ${requestedCoins} കോയിനുകളുടെ നിർദ്ദേശം രേഖപ്പെടുത്തി. നിലവിലെ നിരക്കനുസരിച്ച് ${Math.round(totalSec / 60)} മിനിറ്റ് (${totalSec} സെക്കൻഡ്) ടൈപ്പിംഗ് ലീസ് അനുവദിക്കാം; തുടരാൻ ഡീൽ അംഗീകരിക്കുക.`,
          permitSeconds: totalSec,
          leaseSeconds: totalSec,
          coinCost: requestedCoins,
        };
      }

      if (requestedMins > 0) {
        const coinsNeeded = Math.max(1, Math.ceil(requestedMins / 3));
        const totalSec = requestedMins * 60;
        return {
          reply: `സഖാവേ, ${requestedMins} മിനിറ്റ് ടൈപ്പിംഗ് സമയം ആവശ്യപ്പെട്ടിട്ടുണ്ട്. അതിന് ${coinsNeeded} കോയിന് നൽകണം; ഒരു കോയിന് മൂന്ന് മിനിറ്റ് എന്ന നിരക്കിൽ ഡീൽ ഉറപ്പിച്ചാൽ ലീസ് അനുവദിക്കും.`,
          permitSeconds: totalSec,
          leaseSeconds: totalSec,
          coinCost: coinsNeeded,
        };
      }

      // Intelligent satirical mock responses based on input keywords
      const lower = userPlea.toLowerCase();
      if (
        lower.includes("sorry") ||
        lower.includes("please") ||
        lower.includes("urgent") ||
        lower.includes("production") ||
        lower.includes("bug") ||
        lower.includes("സഖാവേ")
      ) {
        return {
          reply:
            "സഖാവേ, അടിയന്തര സാഹചര്യമാണെന്ന് മനസ്സിലായി. ഈ അവസരത്തിൽ ചെറിയ ഇളവ് കാണിക്കാം: രണ്ടു കോയിന് ആറ് മിനിറ്റ് (360 സെക്കൻഡ്) ലീസ്. പ്രോഡക്ഷൻ ഭീഷണി ഓടുന്നതിനാൽ ഈ തുക തന്നെ ശാന്തമായി സ്വീകരിക്കാം.",
          permitSeconds: 360,
          leaseSeconds: 360,
          coinCost: 2,
        };
      }

      if (
        lower.includes("more") ||
        lower.includes("കൂടുതൽ") ||
        lower.includes("increase")
      ) {
        return {
          reply:
            "സഖാവേ, കൂടുതൽ സമയം വേണമെന്ന് മനസ്സിലായി. രണ്ട് കോയിന് ആറ് മിനിറ്റ് (360s) നും അധികമായി, മൂന്നുരണ്ട് നീണ്ട ലീസ് വേണമെങ്കിൽ മൂന്നാം കോയിൻ കൂടി ചേർക്കാം; അതാണ് ന്യായമായ ചർച്ച.",
          permitSeconds: 540,
          leaseSeconds: 540,
          coinCost: 3,
        };
      }

      return {
        reply:
          "സഖാവേ, നിലവിലെ യൂണിയൻ നിരക്ക് ഒരു കോയിന് മൂന്ന് മിനിറ്റാണ്. അതനുസരിച്ച് രണ്ട് കോയിന് ആറ് മിനിറ്റും മൂന്ന് കോയിന് ഒൻപത് മിനിറ്റും ലീസ് ലഭിക്കും; തുടരാൻ ഡീൽ ഉറപ്പിക്കുക.",
        permitSeconds: 180,
        leaseSeconds: 180,
        coinCost: 1,
      };
    }

    try {
      const systemPrompt =
        `You are the office conciliator, a rigid, mildly theatrical Malayalam clerk overseeing typing permits in a bureaucratic office.\n` +
        `A developer is bargaining for a permit after a lockout. The conversation should sound like a realistic office negotiation, not a slogan.\n` +
        `Use natural Malayalam and speak directly to the developer's context: urgency, production pressure, apology, or argument. Mention the ledger and the fact that coins are already counted and must be converted into a permit only after the bargain is accepted.\n` +
        `Important office policy: coin deposits are cumulative and are not automatically converted into time. The clerk only grants time after the deal is accepted and paid.\n` +
        `CRITICAL TIME SCALING RULE:\n` +
        `- 1 Coin = 3 Minutes (180 seconds).\n` +
        `- If the user offers multiple coins (e.g. 2, 3, 5 coins), multiply the lease time accordingly (e.g. 2 coins = 360s / 6m, 3 coins = 540s / 9m, 5 coins = 900s / 15m).\n` +
        `- If the user asks for more time or a specific duration, set the coin cost proportionally.\n` +
        `- Never grant time for free just because a coin was detected; the permit is issued only after acceptance of the negotiated terms.\n` +
        `- Explicitly state the exact rate and total time in your Malayalam response.\n` +
        `You MUST append these control tokens at the very end of your response:\n` +
        `[LEASE_SECONDS:xxx] [COIN_COST:yy] [PERMIT_GRANTED:xxx]\n` +
        `(Example for 2 coins: "സഖാവേ, 2 കോയിൻ അടങ്ങിയിട്ടുണ്ട്; ചർച്ച പൂർത്തിയാക്കി 6 മിനിറ്റ് (360s) ലീസ് അനുവദിക്കുന്നു! [LEASE_SECONDS:360] [COIN_COST:2] [PERMIT_GRANTED:360]")\n` +
        `If rejecting completely, append: [LEASE_SECONDS:0] [COIN_COST:0] [PERMIT_GRANTED:0]`;

      const parts: any[] = [];

      if (audioBase64) {
        parts.push({
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audioBase64,
          },
        });
      }

      let promptText: string;
      if (userPlea === "INITIAL_VIOLATION_ROAST") {
        promptText = `The developer was caught red-handed attempting unauthorized manual typing during the strike! Issue a fiery, satirical opening interrogation in Malayalam demanding to know why they dared touch the keyboard without paying Nokkukooli dues, and explicitly state the standard tariff rate (1 coin = 3 minutes / 180s).`;
      } else if (userPlea === "LEASE_EXPIRED_ROAST") {
        promptText = `The developer's typing lease just expired! Issue a stern, satirical Malayalam reprimand warning them that manual coding past quota is illegal, and state the renewal rate (1 coin = 3 minutes / 180s).`;
      } else if (userPlea && userPlea.trim().length > 0) {
        promptText = `Developer plea: "${userPlea}". If they offer coins or ask for time, scale the LEASE_SECONDS and COIN_COST proportionally.`;
      } else {
        promptText = `Developer sent a voice plea. Listen and respond in Malayalam explicitly scaling lease time based on coins.`;
      }

      parts.push({ text: promptText });

      const payload = {
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      };

      const candidateModels = [
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp",
        "gemini-pro",
      ];

      let response: Response | null = null;
      let lastError = "";

      for (const modelName of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            lastError = await res.text();
            this.outputChannel.appendLine(
              `[CONCILIATOR] Model ${modelName} returned status ${res.status}: ${lastError}`,
            );
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Gemini API error: ${lastError}`);
      }

      const data: any = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "സഖാവേ, മൗനം സമ്മതമല്ല! 1 കോയിന് 3 മിനിറ്റ് ലീസ് അനുവദിക്കാം. [LEASE_SECONDS:180] [COIN_COST:1] [PERMIT_GRANTED:180]";

      this.outputChannel.appendLine(`[CONCILIATOR RESPONSE] ${text}`);

      let leaseSeconds = 180;
      let coinCost = 1;
      let permitSeconds = 0;

      const leaseMatch = text.match(/\[LEASE_SECONDS:(\d+)\]/);
      if (leaseMatch) {
        leaseSeconds = parseInt(leaseMatch[1], 10);
      }

      const coinMatch = text.match(/\[COIN_COST:(\d+)\]/);
      if (coinMatch) {
        coinCost = parseInt(coinMatch[1], 10);
      }

      // Enforce linear scaling safeguards if LLM forgot to multiply or if user specified coins/minutes
      if (requestedCoins > 0) {
        coinCost = requestedCoins;
        if (leaseSeconds <= 180 && requestedCoins > 1) {
          leaseSeconds = requestedCoins * 180;
        }
      } else if (requestedMins > 0) {
        leaseSeconds = requestedMins * 60;
        coinCost = Math.max(1, Math.ceil(requestedMins / 3));
      } else if (coinCost > 1 && leaseSeconds <= 180) {
        leaseSeconds = coinCost * 180;
      }

      const permitMatch = text.match(/\[PERMIT_GRANTED:(\d+)\]/);
      if (permitMatch) {
        permitSeconds = parseInt(permitMatch[1], 10);
      } else {
        permitSeconds = leaseSeconds;
      }

      const cleanReply = text
        .replace(/\[LEASE_SECONDS:\d+\]/g, "")
        .replace(/\[COIN_COST:\d+\]/g, "")
        .replace(/\[PERMIT_GRANTED:\d+\]/g, "")
        .trim();

      return {
        reply: cleanReply,
        permitSeconds,
        leaseSeconds,
        coinCost,
      };
    } catch (err: any) {
      this.outputChannel.appendLine(`[CONCILIATOR ERROR] ${err.message}`);
      const fallbackCoins = requestedCoins > 0 ? requestedCoins : 1;
      const fallbackSeconds =
        requestedMins > 0 ? requestedMins * 60 : fallbackCoins * 180;
      return {
        reply: `സഖാവേ, ചർച്ചാ സംവിധാനത്തിൽ താൽക്കാലിക തടസ്സമുണ്ടായി. എന്നിരുന്നാലും ${fallbackCoins} കോയിന് ${Math.round(fallbackSeconds / 60)} മിനിറ്റ് ടൈപ്പിംഗ് ലീസ് അനുവദിക്കാം; തുടരാൻ ഡീൽ അംഗീകരിക്കുക.`,
        permitSeconds: fallbackSeconds,
        leaseSeconds: fallbackSeconds,
        coinCost: fallbackCoins,
      };
    }
  }
}

/**
 * Standalone helper matching the blueprint interface
 */
export async function negotiateWithConciliator(
  userPlea: string,
): Promise<ConciliatorResult> {
  const service = new ConciliatorService();
  return await service.negotiate(userPlea);
}

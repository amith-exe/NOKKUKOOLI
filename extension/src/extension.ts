import * as vscode from "vscode";
import * as path from "path";
import { SerialManager } from "./serialManager";
import { AgentService } from "./agentService";
import { SovietSidebarViewProvider } from "./sovietSidebar";
import { StrikeModalManager, PleaMessage } from "./strikeModal";
import { ConciliatorService } from "./conciliatorService";
import { TtsService } from "./ttsService";

export function activate(context: vscode.ExtensionContext) {
  console.log("[nokkukooli] Kommie typing permit system activated.");

  // Core office & permit economy state
  let isLocked: boolean = true;
  let isAgentWriting: boolean = false;
  let permitTimeRemaining: number = 0;
  let permitTimer: NodeJS.Timeout | null = null;
  let strikeInterceptionCount: number = 0;
  let lastToastTime: number = 0;

  // Office ledger coin balance
  let userCoins: number = 0;
  let agreedCost: number = 1;
  let agreedLeaseSeconds: number = 180;

  // Create persistent office status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "nokkukooli.showStrikeDecree";
  context.subscriptions.push(statusBarItem);

  // Forward declaration of UI update
  let sidebarProvider: SovietSidebarViewProvider;

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const updateUI = () => {
    if (isLocked) {
      statusBarItem.text = `$(lock) Office Locked | 🪙 ${userCoins} coins`;
      statusBarItem.tooltip =
        "Manual typing is temporarily shut down. Use the agent or pay the office levy.";
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
      statusBarItem.color = "#2d2d2d";
    } else {
      const timeStr = formatTime(permitTimeRemaining);
      statusBarItem.text = `$(clock) Permit: ${timeStr} | 🪙 ${userCoins} coins`;
      statusBarItem.tooltip = `Typing permit active. ${timeStr} remaining. Ledger: ${userCoins} coins.`;
      if (permitTimeRemaining <= 30) {
        statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        statusBarItem.color = "#7a4b1d";
      } else {
        statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.normalBackground",
        );
        statusBarItem.color = "#1d1d1d";
      }
    }
    statusBarItem.show();

    if (sidebarProvider) {
      sidebarProvider.updateState();
    }

    StrikeModalManager.updateTreasury(
      userCoins,
      permitTimeRemaining,
      agreedCost,
      agreedLeaseSeconds,
    );
  };

  // Instantiate Serial Manager with real physical hardware events ONLY
  const serialManager = new SerialManager({
    onUnlock: (seconds: number) => {
      grantPermit(seconds);
    },
    onLock: () => {
      enforceStrike();
    },
    onCoin: () => {
      userCoins += 1;
      vscode.window.showInformationMessage(
        `🪙 Coin counted. Ledger is now ${userCoins}. Use the bargain desk to convert coins into a permit.`,
      );
      updateUI();
      StrikeModalManager.updateTreasury(
        userCoins,
        permitTimeRemaining,
        agreedCost,
        agreedLeaseSeconds,
      );
    },
    onReady: () => {
      vscode.window.showInformationMessage(
        "Hardware sentinel ready: coin and violation channels are live.",
      );
    },
    onStatusChange: () => {
      updateUI();
    },
  });
  context.subscriptions.push({ dispose: () => serialManager.dispose() });

  // Instantiate Native Agent Service (VS Code Language Model API / Copilot)
  const agentService = new AgentService();

  // Instantiate Gemini Malayalam Conciliator & ElevenLabs TTS Services
  const conciliatorService = new ConciliatorService();
  const ttsService = new TtsService(context);

  // Initialize Constructivist Strike Modal Manager with Physical Arcade Coin Economy
  StrikeModalManager.initialize(
    context.extensionUri,
    () => {
      // Commission Copilot Action: Focus sidebar and launch prompt
      if (sidebarProvider) {
        sidebarProvider.focusInput();
      }
      vscode.commands.executeCommand("nokkukooli.dispatchAgent");
    },
    async () => {
      // Verify Hardware Action
      if (!serialManager.isConnected()) {
        await serialManager.promptSelectPort();
        updateUI();
      } else {
        vscode.window.showInformationMessage(
          `Hardware sentinel linked on ${serialManager.getConnectedPort()}.`,
        );
      }
    },
    async (plea: PleaMessage) => {
      // Process text or audio plea with the office conciliator
      const result = await conciliatorService.negotiate(
        plea.text || "",
        plea.audioBase64,
        plea.mimeType,
      );

      agreedCost = result.coinCost;
      agreedLeaseSeconds = result.leaseSeconds;

      // Generate Malayalam Speech via ElevenLabs Multilingual V2 (if configured)
      const audioUrl = await ttsService.synthesizeMalayalamSpeech(result.reply);

      // Transmit reply back to the webview modal
      StrikeModalManager.sendConciliatorReply(
        result.reply,
        result.permitSeconds,
        result.leaseSeconds,
        result.coinCost,
        audioUrl,
      );
      StrikeModalManager.updateTreasury(
        userCoins,
        permitTimeRemaining,
        agreedCost,
        agreedLeaseSeconds,
      );

      if (result.permitSeconds === 0 && result.leaseSeconds === 0) {
        strikeInterceptionCount++;
        updateUI();
      }
    },
    (coinCost: number, leaseSeconds: number) => {
      // Pay Lease and Renew Action (Physical coins spent)
      if (userCoins >= coinCost && coinCost > 0) {
        userCoins -= coinCost;
        grantPermit(leaseSeconds);
        const mins = Math.floor(leaseSeconds / 60);
        const secs = leaseSeconds % 60;
        vscode.window.showInformationMessage(
          `🪙 Remitted ${coinCost} coin(s)! Permit granted for ${mins}m ${secs}s. (${userCoins} coins remaining in the ledger)`,
        );
      } else {
        vscode.window.showErrorMessage(
          `Insufficient coins: ledger shows ${userCoins}, but this permit requires ${coinCost}.`,
        );
      }
    },
    () => {
      // Strike modal announced it is ready for audio — deliver the cached Malayalam declaration
      sendStrikeNarrationWhenReady();
    },
    async (text: string) => {
      const audioUrl = await ttsService.synthesizeMalayalamSpeech(text);
      StrikeModalManager.sendTextSpeech(audioUrl);
    },
  );

  // Automated AI Opening Call state tracker
  let lastRoastTime = 0;
  let isRoasting = false;

  const initiateInitialRoast = async (
    promptType: string = "INITIAL_VIOLATION_ROAST",
  ) => {
    const now = Date.now();
    if (isRoasting || now - lastRoastTime < 4000) {
      return;
    }
    isRoasting = true;
    lastRoastTime = now;

    try {
      const result = await conciliatorService.negotiate(promptType);
      agreedCost = result.coinCost;
      agreedLeaseSeconds = result.leaseSeconds;
      const audioUrl = await ttsService.synthesizeMalayalamSpeech(result.reply);
      StrikeModalManager.sendConciliatorReply(
        result.reply,
        result.permitSeconds,
        result.leaseSeconds,
        result.coinCost,
        audioUrl,
      );
      StrikeModalManager.updateTreasury(
        userCoins,
        permitTimeRemaining,
        agreedCost,
        agreedLeaseSeconds,
      );
    } catch (err: any) {
      console.error("Initial roast failed:", err);
    } finally {
      isRoasting = false;
    }
  };

  // Malayalam strike declaration spoken aloud when the Work Stoppage page is triggered
  const STRIKE_DECLARATION_ML =
    "സഖാക്കളേ, പണിനിർത്തൽ ഇപ്പോൾ പ്രാബല്യത്തിൽ വന്നിരിക്കുന്നു. അനുമതിയില്ലാത്ത മാനുവൽ ടൈപ്പിംഗ് നിർത്തുക; ജോലി കോമ്രേഡ് ഏജന്റിനെ ഏൽപ്പിക്കുകയോ യൂണിയൻ ലീസ് എടുക്കുകയോ ചെയ്യുക. നിങ്ങളുടെ സഹകരണത്തിന് നന്ദി.";

  // Cache the synthesized declaration so it is generated once per session
  let strikeDeclarationAudio: string | null = null;
  let strikeDeclarationPromise: Promise<string | null> | null = null;

  const getStrikeDeclarationAudio = (): Promise<string | null> => {
    if (strikeDeclarationAudio) {
      return Promise.resolve(strikeDeclarationAudio);
    }
    if (!strikeDeclarationPromise) {
      strikeDeclarationPromise = ttsService
        .synthesizeMalayalamSpeech(STRIKE_DECLARATION_ML)
        .then((audioUrl) => {
          strikeDeclarationAudio = audioUrl;
          if (!audioUrl) {
            console.warn(
              "Malayalam strike narration unavailable (missing ElevenLabs key or synthesis failed).",
            );
          }
          return audioUrl;
        })
        .catch((err: any) => {
          console.error("Office narration synthesis failed:", err);
          strikeDeclarationPromise = null; // allow retry on next trigger
          return null;
        });
    }
    return strikeDeclarationPromise;
  };

  // Hand the cached narration to a modal that just announced it is ready for audio
  const sendStrikeNarrationWhenReady = () => {
    getStrikeDeclarationAudio().then((audioUrl) => {
      if (audioUrl) {
        StrikeModalManager.sendStrikeNarration(audioUrl);
      }
    });
  };

  // Trigger strike alert, transmit hardware signal, and display BOTH Constructivist Modal & Throttled Native Toast
  const triggerStrike = (
    reason: string,
    roastType: string = "INITIAL_VIOLATION_ROAST",
  ) => {
    strikeInterceptionCount++;
    updateUI();
    serialManager.sendStrike();

    // Kick off Malayalam narration synthesis in parallel with the modal opening
    void getStrikeDeclarationAudio();

    // 1. Reveal (or focus) the custom Constructivist Red Alert Strike Modal
    StrikeModalManager.showStrikeDecree(
      strikeInterceptionCount,
      serialManager.getConnectedPort(),
      userCoins,
      permitTimeRemaining,
      agreedCost,
      agreedLeaseSeconds,
    );

    // 2. Automated opening call: the office clerk immediately demands an explanation or tariff
    initiateInitialRoast(roastType);

    // 3. Trigger Native Toast with interactive actions (Throttled to prevent alert spam)
    const now = Date.now();
    if (now - lastToastTime > 3000) {
      lastToastTime = now;
      const alertMsg =
        "Office lock active: manual typing prohibited. Use the agent or review the permit notice.";
      vscode.window
        .showErrorMessage(
          alertMsg,
          "Use Agent",
          "Permit Notice",
          "Hardware Status",
        )
        .then((selection) => {
          if (selection === "Use Agent") {
            StrikeModalManager.closeCurrentModal();
            if (sidebarProvider) {
              sidebarProvider.focusInput();
            }
            vscode.commands.executeCommand("nokkukooli.dispatchAgent");
          } else if (selection === "Permit Notice") {
            vscode.commands.executeCommand("nokkukooli.showStrikeDecree");
          } else if (selection === "Hardware Status") {
            vscode.commands.executeCommand("nokkukooli.selectSerialPort");
          }
        });
    }
  };

  // Grant temporary work lease (additive lease extension)
  const grantPermit = (seconds: number = 180, closeModal: boolean = true) => {
    if (permitTimer) {
      clearInterval(permitTimer);
      permitTimer = null;
    }

    isLocked = false;
    permitTimeRemaining =
      (permitTimeRemaining > 0 ? permitTimeRemaining : 0) + seconds;
    updateUI();

    // Paid leases close the modal; hardware coins keep it open for live bargaining feedback.
    if (closeModal) {
      StrikeModalManager.notifyPermitGranted(permitTimeRemaining, userCoins);
    }

    serialManager.sendReset();

    permitTimer = setInterval(() => {
      permitTimeRemaining--;
      if (permitTimeRemaining <= 0) {
        if (permitTimer) {
          clearInterval(permitTimer);
          permitTimer = null;
        }
        enforceStrike();
        // STRICT LEASE EXPIRATION RESET: Reset agreed terms and force complete restart from scratch
        agreedCost = 1;
        agreedLeaseSeconds = 180;
        vscode.window.showErrorMessage(
          `The permit expired. Return to the office desk, renegotiate, and pay the levy again.`,
        );
        triggerStrike(
          "The permit expired. Return to the desk, renegotiate, and pay the levy again.",
          "INITIAL_VIOLATION_ROAST",
        );
      } else {
        updateUI();
        if (permitTimeRemaining === 30) {
          vscode.window.showWarningMessage(
            "Thirty seconds remain on the permit. The office lock will resume shortly.",
          );
        }
      }
    }, 1000);
  };

  // Enforce office lock
  const enforceStrike = () => {
    if (permitTimer) {
      clearInterval(permitTimer);
      permitTimer = null;
    }
    isLocked = true;
    permitTimeRemaining = 0;
    updateUI();
    serialManager.sendStrike();
  };

  // Dispatch the office agent task directly into the editor
  const dispatchCopilotTask = async (prompt: string): Promise<boolean> => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "No editor is open. Open a file before issuing a task.",
      );
      return false;
    }

    const languageId = editor.document.languageId || "plaintext";

    let generatedCode = "";
    let success = false;

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Writing code via the office agent...",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 30,
            message: "Drafting acceptable prose in code form...",
          });
          generatedCode = await agentService.generateCode(prompt, languageId);

          progress.report({
            increment: 70,
            message: "Inserting the draft into the editor...",
          });

          // CRITICAL BYPASS: Set isAgentWriting = true for extra safety
          isAgentWriting = true;
          try {
            await editor.edit((builder) => {
              const position = editor.selection.active;
              builder.insert(position, generatedCode);
            });
            success = true;
          } finally {
            isAgentWriting = false;
          }

          progress.report({ increment: 100, message: "Quota fulfilled!" });
        },
      );

      if (success) {
        vscode.window.showInformationMessage(
          "The office agent fulfilled the brief successfully.",
        );
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Agent task failed: ${err.message || "Code generation failed"}`,
      );
      success = false;
    } finally {
      isAgentWriting = false;
    }

    return success;
  };

  // Sidebar Provider
  let isCopilotReady = true;
  agentService.isCopilotAvailable().then((avail) => {
    isCopilotReady = avail;
  });

  sidebarProvider = new SovietSidebarViewProvider(
    context.extensionUri,
    () => ({
      isLocked,
      permitRemaining: permitTimeRemaining,
      connectedPort: serialManager.getConnectedPort(),
      hardwareStatus: serialManager.getStatus(),
      strikeCount: strikeInterceptionCount,
      isCopilotAvailable: isCopilotReady,
      coinBalance: userCoins,
    }),
    async (taskPrompt: string) => {
      return await dispatchCopilotTask(taskPrompt);
    },
    async () => {
      await serialManager.promptSelectPort();
      updateUI();
    },
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SovietSidebarViewProvider.viewType,
      sidebarProvider,
    ),
  );

  // =========================================================================
  // NATIVE TYPE & PASTE COMMAND INTERCEPTION (Precise Lockout Mechanism)
  // Swallows manual typing and paste actions before reaching document buffer.
  // Opens Constructivist Red Alert Decree Modal upon unauthorized input.
  // =========================================================================

  const typeDisposable = vscode.commands.registerCommand(
    "type",
    async (args) => {
      if (isLocked && !isAgentWriting) {
        triggerStrike(
          "Manual keystrokes are restricted. Use the office agent to continue.",
          "INITIAL_VIOLATION_ROAST",
        );
        return; // Intercept and drop keystroke before buffer insertion
      }
      await vscode.commands.executeCommand("default:type", args);
    },
  );
  context.subscriptions.push(typeDisposable);

  const pasteDisposable = vscode.commands.registerCommand(
    "paste",
    async (args) => {
      if (isLocked && !isAgentWriting) {
        triggerStrike(
          "Manual paste is restricted. Use the office agent instead.",
          "INITIAL_VIOLATION_ROAST",
        );
        return; // Intercept and drop paste before buffer insertion
      }
      await vscode.commands.executeCommand("default:paste", args);
    },
  );
  context.subscriptions.push(pasteDisposable);

  // REGISTER COMMANDS
  context.subscriptions.push(
    vscode.commands.registerCommand("nokkukooli.dispatchAgent", async () => {
      const prompt = await vscode.window.showInputBox({
        title: "Dispatch office agent",
        placeHolder: "Describe the task for the coding clerk",
        prompt:
          "The agent will write the result directly into the active file.",
      });

      if (prompt) {
        await dispatchCopilotTask(prompt);
      }
    }),

    vscode.commands.registerCommand("nokkukooli.showStrikeDecree", () => {
      StrikeModalManager.showStrikeDecree(
        strikeInterceptionCount,
        serialManager.getConnectedPort(),
        userCoins,
        permitTimeRemaining,
        agreedCost,
        agreedLeaseSeconds,
      );
    }),

    vscode.commands.registerCommand("nokkukooli.lockStrike", () => {
      enforceStrike();
      vscode.window.showWarningMessage(
        "Office lock engaged: the editor is now under restricted access.",
      );
    }),

    vscode.commands.registerCommand("nokkukooli.selectPort", async () => {
      await serialManager.promptSelectPort();
      updateUI();
    }),

    vscode.commands.registerCommand("nokkukooli.selectSerialPort", async () => {
      await serialManager.promptSelectPort();
      updateUI();
    }),

    vscode.commands.registerCommand("nokkukooli.openWebsite", () => {
      const websitePath = vscode.Uri.file(
        path.join(context.extensionPath, "..", "website", "index.html"),
      );
      vscode.env.openExternal(websitePath);
    }),

    vscode.commands.registerCommand("nokkukooli.setElevenLabsKey", async () => {
      const key = await vscode.window.showInputBox({
        title: "Configure speech key",
        placeHolder: "Paste your ElevenLabs API key (sk_...)",
        password: true,
        ignoreFocusOut: true,
        prompt:
          "The key is stored securely and used only for speech synthesis.",
      });
      if (key && key.trim()) {
        await ttsService.setApiKey(key);
        vscode.window.showInformationMessage(
          "The speech key is stored securely. The office announcer can speak now.",
        );
      }
    }),

    vscode.commands.registerCommand(
      "nokkukooli.clearElevenLabsKey",
      async () => {
        await ttsService.clearApiKey();
        vscode.window.showInformationMessage(
          "The speech key was cleared. The office announcer is silent.",
        );
      },
    ),

    vscode.commands.registerCommand("nokkukooli.testTTS", async () => {
      if (!(await ttsService.hasApiKey())) {
        const setup = await vscode.window.showErrorMessage(
          "No speech key is configured.",
          "Set API Key",
        );
        if (setup === "Set API Key") {
          vscode.commands.executeCommand("nokkukooli.setElevenLabsKey");
        }
        return;
      }
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "The office announcer is warming up...",
            cancellable: false,
          },
          async () => {
            const audioUrl = await ttsService.synthesizeMalayalamSpeech(
              "സഖാവേ! യൂണിയൻ ശബ്ദം സജീവമാണ്. നോക്കുകൂലി കോയിൻ നൽകാതെ കീബോർഡിൽ തൊടരുത്!",
            );
            if (audioUrl) {
              vscode.window
                .showInformationMessage(
                  "Speech synthesis is working. Open the permit notice to listen.",
                  "Open Permit Notice",
                )
                .then((sel) => {
                  if (sel === "Open Permit Notice") {
                    vscode.commands.executeCommand(
                      "nokkukooli.showStrikeDecree",
                    );
                  }
                });
            } else {
              vscode.window.showErrorMessage(
                "Speech synthesis failed. Check the office log for details.",
              );
            }
          },
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Speech error: ${err.message || err}`);
      }
    }),
  );

  // Initial status update
  updateUI();

  // Announce the initial work stoppage as soon as the extension becomes active.
  setTimeout(() => {
    triggerStrike(
      "Work stoppage initialized at extension startup.",
      "INITIAL_VIOLATION_ROAST",
    );
  }, 0);
}

export function deactivate() {
  console.log("[nokkukooli] Deactivated.");
}

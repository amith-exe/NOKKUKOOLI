import * as vscode from "vscode";

export interface PleaMessage {
  type: "text" | "audio";
  text?: string;
  audioBase64?: string;
  mimeType?: string;
}

export class StrikeModalManager {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static extensionUri: vscode.Uri;
  private static onCommissionCopilotCallback: () => void;
  private static onVerifyHardwareCallback: () => void;
  private static onSubmitPleaCallback: (plea: PleaMessage) => void;
  private static onSpeakTextCallback: ((text: string) => void) | undefined;
  private static onPayLeaseCallback: (
    coinCost: number,
    leaseSeconds: number,
  ) => void;
  private static onReadyForNarrationCallback: (() => void) | undefined;

  public static initialize(
    extensionUri: vscode.Uri,
    onCommissionCopilot: () => void,
    onVerifyHardware: () => void,
    onSubmitPlea: (plea: PleaMessage) => void,
    onPayLease: (coinCost: number, leaseSeconds: number) => void,
    onReadyForNarration?: () => void,
    onSpeakText?: (text: string) => void,
  ) {
    this.extensionUri = extensionUri;
    this.onCommissionCopilotCallback = onCommissionCopilot;
    this.onVerifyHardwareCallback = onVerifyHardware;
    this.onSubmitPleaCallback = onSubmitPlea;
    this.onPayLeaseCallback = onPayLease;
    this.onReadyForNarrationCallback = onReadyForNarration;
    this.onSpeakTextCallback = onSpeakText;
  }

  public static showStrikeDecree(
    reversals: number,
    portName: string | null,
    coins: number = 0,
    activeLeaseSeconds: number = 0,
    agreedCost: number = 1,
    agreedLeaseSeconds: number = 180,
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (this.currentPanel) {
      this.currentPanel.reveal(column);
      this.currentPanel.webview.postMessage({
        type: "TRIGGER_ALARM",
        reversals,
        portName,
        coins,
        activeLeaseSeconds,
        agreedCost,
        agreedLeaseSeconds,
      });
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "nokkukooliStrikeDecree",
      "Office Lock Notice",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      },
    );

    this.currentPanel = panel;
    panel.webview.html = this.getHtmlForWebview(
      reversals,
      portName,
      coins,
      activeLeaseSeconds,
      agreedCost,
      agreedLeaseSeconds,
    );

    panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "COMMISSION_COPILOT":
          panel.dispose();
          this.onCommissionCopilotCallback();
          break;
        case "VERIFY_HARDWARE":
          this.onVerifyHardwareCallback();
          break;
        case "SUBMIT_TEXT_PLEA":
          this.onSubmitPleaCallback({
            type: "text",
            text: data.text,
          });
          break;
        case "SUBMIT_AUDIO_PLEA":
          this.onSubmitPleaCallback({
            type: "audio",
            text: data.text,
            audioBase64: data.audioBase64,
            mimeType: data.mimeType,
          });
          break;
        case "PAY_LEASE_AND_RENEW":
          this.onPayLeaseCallback(data.coinCost, data.leaseSeconds);
          break;
        case "READY_FOR_NARRATION":
          if (this.onReadyForNarrationCallback) {
            this.onReadyForNarrationCallback();
          }
          break;
        case "SPEAK_TEXT":
          if (
            this.onSpeakTextCallback &&
            typeof data.text === "string" &&
            data.text.trim()
          ) {
            this.onSpeakTextCallback(data.text.trim());
          }
          break;
        case "CLOSE_DECREE":
          panel.dispose();
          break;
      }
    });

    panel.onDidDispose(() => {
      this.currentPanel = undefined;
    });
  }

  /**
   * Sends the Malayalam strike declaration audio to the open modal and asks it to
   * play immediately (the webview requests this right after load so speech starts
   * as soon as the Work Stoppage page appears).
   */
  public static sendStrikeNarration(audioDataUri: string) {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({
        type: "PLAY_STRIKE_NARRATION",
        audioUrl: audioDataUri,
      });
    }
  }

  public static sendConciliatorReply(
    replyText: string,
    permitSeconds: number,
    leaseSeconds: number,
    coinCost: number,
    audioUrl: string | null,
  ) {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({
        type: "CONCILIATOR_REPLY",
        reply: replyText,
        permitSeconds: permitSeconds,
        leaseSeconds: leaseSeconds,
        coinCost: coinCost,
        audioUrl: audioUrl,
      });
    }
  }

  public static sendTextSpeech(audioUrl: string | null) {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({
        type: "TEXT_SPEECH_REPLY",
        audioUrl,
      });
    }
  }

  public static updateTreasury(
    coins: number,
    activeLeaseSeconds: number,
    agreedCost?: number,
    agreedLeaseSeconds?: number,
  ) {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({
        type: "UPDATE_TREASURY",
        coins,
        activeLeaseSeconds,
        agreedCost,
        agreedLeaseSeconds,
      });
    }
  }

  public static notifyPermitGranted(seconds: number, remainingCoins: number) {
    if (this.currentPanel) {
      this.currentPanel.webview.postMessage({
        type: "PERMIT_GRANTED",
        seconds,
        coins: remainingCoins,
      });
      setTimeout(() => {
        if (this.currentPanel) {
          this.currentPanel.dispose();
        }
      }, 1800);
    }
  }

  public static closeCurrentModal() {
    if (this.currentPanel) {
      this.currentPanel.dispose();
      this.currentPanel = undefined;
    }
  }

  public static isModalOpen(): boolean {
    return this.currentPanel !== undefined;
  }

  private static getHtmlForWebview(
    reversals: number,
    portName: string | null,
    initialCoins: number,
    activeLeaseSeconds: number,
    agreedCost: number,
    agreedLeaseSeconds: number,
  ): string {
    const portDisplay = portName ? portName : "Disconnected / virtual";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Office Permit Notice</title>
    <style>
        :root {
            --bg-dark: #120404;
            --bg-card: #1c0808;
            --bg-panel: #260c0c;
            --crimson-alert: #a31919;
            --crimson-bright: #e62e2e;
            --gold-accent: #e5a93b;
            --gold-bright: #ffd24d;
            --green-clear: #2ecc71;
            --arcade-gold: #f39c12;
            --text-main: #f5eedb;
            --text-dim: #a69888;
            --border-gold: #e5a93b;
            --border-dim: #421818;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-dark);
            background-image: 
                linear-gradient(rgba(18, 4, 4, 0) 50%, rgba(0, 0, 0, 0.4) 50%),
                radial-gradient(ellipse at center, rgba(163, 25, 25, 0.18) 0%, rgba(18, 4, 4, 0.98) 100%);
            background-size: 100% 4px, 100% 100%;
            color: var(--text-main);
            font-family: 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
        }

        /* Hazard Warning Tape */
        .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(
                -45deg,
                var(--crimson-alert),
                var(--crimson-alert) 14px,
                var(--gold-accent) 14px,
                var(--gold-accent) 28px
            );
            width: 100%;
            margin-bottom: 16px;
            border: 1px solid var(--border-gold);
            animation: moveStripes 2s linear infinite;
        }

        @keyframes moveStripes {
            0% { background-position: 0 0; }
            100% { background-position: 56px 0; }
        }

        /* Main Container Plaque */
        .strike-container {
            max-width: 880px;
            width: 100%;
            background: var(--bg-card);
            border: 2px solid var(--border-gold);
            padding: 24px;
            box-shadow: 0 0 40px rgba(163, 25, 25, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.9);
            position: relative;
            transition: all 0.3s ease;
        }

        /* Clearance State */
        .strike-container.clearance-granted {
            border-color: var(--green-clear);
            box-shadow: 0 0 50px rgba(46, 204, 113, 0.7);
            animation: pulse-green 1s infinite alternate;
        }

        @keyframes pulse-green {
            from { filter: brightness(1); }
            to { filter: brightness(1.25); }
        }

        /* Hero Header */
        .hero-header {
            text-align: center;
            margin-bottom: 14px;
            border-bottom: 2px solid var(--border-dim);
            padding-bottom: 10px;
            position: relative;
        }

        .siren-badge {
            position: absolute;
            top: 0;
            right: 0;
            background: var(--crimson-bright);
            color: #fff;
            font-size: 9px;
            font-weight: bold;
            padding: 4px 8px;
            border: 1px solid var(--gold-bright);
            border-radius: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
            animation: flash-siren 0.5s infinite alternate;
            cursor: pointer;
        }

        @keyframes flash-siren {
            from { background: #7a1212; }
            to { background: #ff2222; box-shadow: 0 0 10px #ff2222; }
        }

        /* Malayalam Strike Narration Badge (stacked under the siren badge) */
        .narration-button {
            top: 34px;
            animation: none;
            background: #1d3a1d;
            color: #ffffff;
            cursor: pointer;
        }

        .narration-button.playing {
            animation: flash-narration 0.6s infinite alternate;
        }

        .narration-button:hover,
        .narration-button:focus-visible {
            outline: 2px solid var(--gold-bright);
            outline-offset: 2px;
        }

        @keyframes flash-narration {
            from { background: #1d3a1d; }
            to { background: #2ecc40; box-shadow: 0 0 10px #2ecc40; }
        }

        .hero-tag {
            font-size: 9.5px;
            color: var(--gold-accent);
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 6px;
        }

        .hero-title {
            font-size: 17px;
            font-weight: 900;
            color: var(--crimson-bright);
            letter-spacing: 1.5px;
            text-transform: uppercase;
            text-shadow: 0 0 12px rgba(230, 46, 46, 0.7);
            margin-bottom: 6px;
        }

        .incident-stamp {
            display: inline-block;
            background: #2b0c0c;
            border: 1px solid var(--crimson-alert);
            color: var(--gold-bright);
            font-size: 9px;
            padding: 3px 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        /* Satirical Indictment */
        .indictment-box {
            background: var(--bg-panel);
            border-left: 4px solid var(--crimson-alert);
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 10.5px;
            line-height: 1.45;
            color: var(--text-main);
        }

        .indictment-box strong {
            color: var(--gold-bright);
        }

        /* =========================================================================
           OFFICE PERMIT LEDGER / RENEWAL CARD
           ========================================================================= */
        .vending-card {
            background: linear-gradient(180deg, #2b1100, #140700);
            border: 2px solid var(--arcade-gold);
            padding: 14px;
            margin-bottom: 16px;
            box-shadow: 0 0 20px rgba(243, 156, 18, 0.25), inset 0 0 10px rgba(0,0,0,0.8);
        }

        .vending-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px dashed var(--arcade-gold);
            padding-bottom: 6px;
            margin-bottom: 10px;
        }

        .vending-title {
            font-size: 11.5px;
            font-weight: 900;
            color: var(--gold-bright);
            letter-spacing: 1.2px;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .treasury-badge {
            background: #421f00;
            border: 1px solid var(--arcade-gold);
            color: #ffd700;
            font-size: 11px;
            font-weight: 900;
            padding: 3px 10px;
            letter-spacing: 1px;
            animation: glowCoins 1.5s infinite alternate;
        }

        @keyframes glowCoins {
            from { box-shadow: 0 0 4px rgba(255, 215, 0, 0.3); }
            to { box-shadow: 0 0 12px rgba(255, 215, 0, 0.8); }
        }

        /* Tariff Terms Grid */
        .tariff-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 10px;
        }

        .stat-box {
            background: #100400;
            border: 1px solid #542b00;
            padding: 8px 10px;
            text-align: center;
        }

        .stat-box .lbl {
            font-size: 8.5px;
            color: var(--text-dim);
            text-transform: uppercase;
            margin-bottom: 3px;
        }

        .stat-box .val {
            font-size: 12.5px;
            font-weight: 900;
            color: var(--gold-bright);
        }

        .status-badge {
            font-size: 9.5px;
            font-weight: bold;
            padding: 4px 6px;
            border-radius: 2px;
            text-transform: uppercase;
            display: inline-block;
        }

        .status-pending {
            background: #4a2800;
            color: #ffcc00;
            border: 1px solid #ffaa00;
            animation: pulseStatus 1s infinite alternate;
        }

        .status-ratified {
            background: #0f3d1f;
            color: #55ff88;
            border: 1px solid var(--green-clear);
        }

        @keyframes pulseStatus {
            from { opacity: 0.8; }
            to { opacity: 1; }
        }

        /* Vending Actions Row (Strictly 2 Columns: Agree Deal + Pay Physical Coins) */
        .vending-actions {
            display: grid;
            grid-template-columns: 1fr 1.3fr;
            gap: 10px;
            align-items: center;
        }

        .btn-agree-deal {
            background: linear-gradient(180deg, #d49a24, #946400);
            border: 1.5px solid var(--gold-bright);
            color: #120404;
            font-family: inherit;
            font-size: 11px;
            font-weight: 900;
            padding: 10px 12px;
            cursor: pointer;
            text-align: center;
            letter-spacing: 1px;
            text-transform: uppercase;
            transition: all 0.15s;
            box-shadow: 0 0 10px rgba(229, 169, 59, 0.4);
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn-agree-deal:hover {
            background: linear-gradient(180deg, #ffd24d, #e5a93b);
            box-shadow: 0 0 18px rgba(255, 210, 77, 0.8);
            transform: translateY(-1px);
        }

        .btn-agree-deal.ratified {
            background: #0f3d1f;
            border-color: var(--green-clear);
            color: #eaffea;
            box-shadow: 0 0 15px rgba(46, 204, 113, 0.5);
        }

        .btn-pay-lease {
            background: linear-gradient(180deg, #d35400, #962d00);
            border: 2px solid var(--arcade-gold);
            color: #ffffff;
            font-family: inherit;
            font-size: 11px;
            font-weight: 900;
            padding: 10px 12px;
            cursor: pointer;
            text-align: center;
            letter-spacing: 1px;
            text-transform: uppercase;
            transition: all 0.15s;
            box-shadow: 0 0 10px rgba(211, 84, 0, 0.5);
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn-pay-lease:hover:not(:disabled) {
            background: linear-gradient(180deg, #e67e22, #d35400);
            box-shadow: 0 0 20px rgba(243, 156, 18, 0.8);
            transform: translateY(-1px);
        }

        .btn-pay-lease:disabled {
            background: #2a1500;
            border-color: #553300;
            color: #775533;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        /* Bargaining & Conciliation Section */
        .conciliation-panel {
            background: #150505;
            border: 1.5px solid var(--gold-accent);
            padding: 14px;
            margin-bottom: 14px;
        }

        .conciliation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            border-bottom: 1px dashed var(--border-dim);
            padding-bottom: 6px;
        }

        .conciliation-title {
            font-size: 11px;
            font-weight: bold;
            color: var(--gold-bright);
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .conciliator-badge {
            font-size: 9px;
            background: #2b0f0f;
            border: 1px solid var(--crimson-bright);
            color: #ff9999;
            padding: 2px 8px;
            text-transform: uppercase;
            font-weight: bold;
        }

        /* Quick Plea Chips */
        .quick-chips-row {
            display: flex;
            gap: 6px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }

        .chip {
            background: #220a0a;
            border: 1px solid var(--border-dim);
            color: var(--gold-accent);
            font-size: 9px;
            padding: 3px 8px;
            cursor: pointer;
            transition: all 0.15s;
            font-family: inherit;
        }

        .chip:hover {
            border-color: var(--gold-accent);
            background: #361010;
            color: #ffffff;
        }

        /* Conciliation Chat Log */
        .chat-log {
            background: #0d0303;
            border: 1px solid var(--border-dim);
            padding: 10px;
            min-height: 85px;
            max-height: 135px;
            overflow-y: auto;
            margin-bottom: 10px;
            font-size: 11px;
            line-height: 1.45;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .chat-bubble {
            padding: 8px 12px;
            border-radius: 2px;
            max-width: 90%;
            word-break: break-word;
        }

        .chat-bubble.conciliator {
            background: #230808;
            border-left: 3px solid var(--crimson-bright);
            color: #fff1d6;
            align-self: flex-start;
        }

        .chat-bubble.developer {
            background: #1b170c;
            border-right: 3px solid var(--gold-accent);
            color: var(--gold-bright);
            align-self: flex-end;
            text-align: right;
        }

        .chat-speaker {
            font-size: 9px;
            font-weight: bold;
            color: var(--gold-accent);
            margin-bottom: 3px;
            text-transform: uppercase;
        }

        .chat-bubble.conciliator .chat-speaker {
            color: var(--crimson-bright);
        }

        /* TTS Replay Button */
        .btn-tts-replay {
            display: inline-block;
            margin-top: 6px;
            background: #361010;
            border: 1px solid var(--gold-accent);
            color: var(--gold-bright);
            font-family: inherit;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1px;
            padding: 4px 10px;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.15s;
        }

        .btn-tts-replay:hover {
            background: #472600;
            border-color: var(--gold-bright);
            box-shadow: 0 0 8px rgba(255, 210, 77, 0.4);
        }

        .btn-tts-replay.playing {
            background: var(--crimson-bright);
            border-color: var(--gold-bright);
            color: #ffffff;
            animation: pulse-mic 0.6s infinite alternate;
        }

        .btn-speak-text {
            background: var(--gold-accent);
            border: 1.5px solid var(--gold-bright);
            color: var(--bg-dark);
            padding: 8px 12px;
            font-family: inherit;
            font-size: 10.5px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .btn-speak-text:hover,
        .btn-speak-text.speaking {
            background: var(--gold-bright);
            box-shadow: 0 0 10px rgba(255, 210, 77, 0.45);
        }

        .btn-speak-text:disabled {
            cursor: wait;
            opacity: 0.75;
        }

        /* Input Controls Row */
        .bargaining-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .plea-input {
            flex: 1;
            background: #080202;
            border: 1.5px solid var(--border-gold);
            color: var(--text-main);
            font-family: inherit;
            font-size: 11px;
            padding: 8px 10px;
            outline: none;
            transition: all 0.2s;
        }

        .plea-input:focus {
            border-color: var(--gold-bright);
            box-shadow: 0 0 8px rgba(255, 210, 77, 0.3);
        }

        .btn-mic {
            background: #2a0b0b;
            border: 1.5px solid var(--crimson-alert);
            color: var(--gold-bright);
            padding: 8px 12px;
            font-family: inherit;
            font-size: 10.5px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .btn-mic:hover {
            background: #401010;
            border-color: var(--crimson-bright);
            box-shadow: 0 0 10px rgba(230, 46, 46, 0.5);
        }

        .btn-mic.recording {
            background: var(--crimson-bright);
            color: #ffffff;
            border-color: var(--gold-bright);
            animation: pulse-mic 0.6s infinite alternate;
        }

        @keyframes pulse-mic {
            from { box-shadow: 0 0 8px var(--crimson-bright); }
            to { box-shadow: 0 0 25px var(--crimson-bright), 0 0 35px var(--gold-bright); }
        }

        .btn-plea-submit {
            background: #2b1700;
            border: 1.5px solid var(--gold-accent);
            color: var(--gold-bright);
            padding: 8px 14px;
            font-family: inherit;
            font-size: 10.5px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
        }

        .btn-plea-submit:hover {
            background: #472600;
            box-shadow: 0 0 10px rgba(229, 169, 59, 0.6);
        }

        .conciliation-status {
            font-size: 9.5px;
            color: var(--gold-bright);
            margin-top: 6px;
            display: none;
            text-align: center;
            font-weight: bold;
            animation: pulse-text 0.8s infinite alternate;
        }

        @keyframes pulse-text {
            from { opacity: 0.6; }
            to { opacity: 1; }
        }

        /* Telemetry Bar */
        .telemetry-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }

        .telemetry-item {
            background: #190606;
            border: 1px solid var(--border-dim);
            padding: 6px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
        }

        .telemetry-item .label {
            color: var(--text-dim);
            text-transform: uppercase;
        }

        .telemetry-item .val {
            color: var(--gold-accent);
            font-weight: bold;
        }

        /* Action Buttons */
        .actions-container {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 8px;
        }

        .btn {
            padding: 10px 12px;
            font-family: inherit;
            font-size: 10.5px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            text-align: center;
            cursor: pointer;
            border: 1.5px solid;
            transition: all 0.15s ease-in-out;
            outline: none;
        }

        .btn:active {
            transform: translateY(1px);
        }

        .btn-copilot {
            background: linear-gradient(180deg, var(--crimson-alert), #6e1010);
            border-color: var(--border-gold);
            color: var(--gold-bright);
            box-shadow: 0 0 12px rgba(230, 46, 46, 0.4);
        }

        .btn-copilot:hover {
            background: linear-gradient(180deg, var(--crimson-bright), var(--crimson-alert));
            box-shadow: 0 0 16px rgba(255, 210, 77, 0.6);
            color: #ffffff;
        }

        .btn-hardware {
            background: #2b1700;
            border-color: var(--gold-accent);
            color: var(--gold-bright);
        }

        .btn-hardware:hover {
            background: #472600;
            box-shadow: 0 0 10px rgba(229, 169, 59, 0.5);
        }

        /* Clearance Banner */
        .clearance-banner {
            display: none;
            background: #0f3d1f;
            border: 2px solid var(--green-clear);
            color: #eaffea;
            font-size: 13px;
            font-weight: 900;
            padding: 14px;
            text-align: center;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 12px;
            animation: flashGreen 0.4s infinite alternate;
        }

        @keyframes flashGreen {
            from { background: #0f3d1f; }
            to { background: #1a6333; }
        }

        body {
            background:
                radial-gradient(circle at top, rgba(208, 59, 59, 0.2), transparent 38%),
                linear-gradient(180deg, #120707 0%, #200b0b 100%);
            color: var(--text-main);
            font-family: 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
            padding: 20px;
        }

        .strike-container {
            max-width: 880px;
            width: 100%;
            background: linear-gradient(180deg, rgba(34, 10, 10, 0.96), rgba(18, 5, 5, 0.98));
            border: 2px solid var(--border-gold);
            border-radius: 0;
            padding: 24px;
            box-shadow: 0 0 40px rgba(163, 25, 25, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.9);
        }

        .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(
                -45deg,
                var(--crimson-alert),
                var(--crimson-alert) 14px,
                var(--gold-accent) 14px,
                var(--gold-accent) 28px
            );
            border: 1px solid var(--border-gold);
            margin-bottom: 16px;
            animation: moveStripes 2s linear infinite;
        }

        .hero-header {
            text-align: center;
            border-bottom: 2px solid var(--border-dim);
            padding: 0 0 10px;
        }

        .hero-tag,
        .incident-stamp,
        .vending-title,
        .conciliator-badge,
        .telemetry-item .label {
            color: var(--gold-accent);
        }

        .hero-title {
            color: var(--crimson-bright);
            text-shadow: 0 0 12px rgba(230, 46, 46, 0.7);
            letter-spacing: 1.5px;
        }

        .incident-stamp {
            background: #2b0c0c;
            border: 1px solid var(--crimson-alert);
            color: var(--gold-bright);
        }

        .siren-badge {
            animation: flash-siren 0.5s infinite alternate;
            border-radius: 2px;
        }

        .narration-button {
            top: 34px;
            right: 0;
            border: 1px solid var(--gold-bright);
            border-radius: 2px;
            background: #1d3a1d;
            color: #ffffff;
            font: inherit;
            font-size: 9px;
            padding: 4px 8px;
        }

        .narration-button.playing {
            background: #2ecc40;
            animation: flash-narration 0.6s infinite alternate;
        }

        .vending-card,
        .conciliation-panel {
            background: linear-gradient(180deg, rgba(43, 17, 0, 0.92), rgba(20, 7, 0, 0.92));
            border: 2px solid var(--arcade-gold);
            box-shadow: 0 0 20px rgba(243, 156, 18, 0.25), inset 0 0 10px rgba(0,0,0,0.8);
            border-radius: 0;
        }

        .vending-card {
            margin-top: 20px;
        }

        .chat-log {
            background: #0d0303;
            border-color: var(--border-dim);
        }

        .plea-input {
            background: rgba(8, 2, 2, 0.9);
            color: var(--text-main);
            border-color: var(--border-gold);
        }

        .telemetry-row {
            border-color: var(--border-dim);
        }

        .actions-container {
            border-top-color: var(--border-dim);
        }
    </style>
</head>
<body>
    <div id="strikeContainer" class="strike-container">
        <!-- Hazard Stripe -->
        <div class="hazard-stripe"></div>

        <!-- Clearance Success Banner (Hidden by default) -->
        <div id="clearanceBanner" class="clearance-banner">
            ★ TARIFF RATIFIED // LEASE RENEWED ★
        </div>

        <!-- Hero Header -->
        <div class="hero-header">
            <button id="narrationBadge" class="siren-badge narration-button" type="button" title="Play the Malayalam strike declaration">
                <span>🔊</span>
                <span id="narrationText">PLAY MALAYALAM VOICE</span>
            </button>
            <div class="hero-tag">Office Standards Board</div>
            <div class="hero-title">Typing permit required — the desk is locked</div>
            <div class="incident-stamp">Permit ledger and brief negotiation</div>
        </div>

        <!-- =========================================================================
             UNION VENDING TERMINAL / LEASE PAYMENT CARD
             ========================================================================= -->
        <div class="vending-card">
            <div class="vending-header">
                <div class="vending-title">
                    <span>🪙 Office permit ledger</span>
                </div>
                <div id="treasuryBadge" class="treasury-badge">
                    🪙 LEDGER: <span id="coinCount">${initialCoins}</span> COINS
                </div>
            </div>

            <!-- Dynamic Terms Breakdown -->
            <div class="tariff-grid">
                <div class="stat-box">
                    <div class="lbl">Unit Tariff Rate</div>
                    <div id="ratePerCoinVal" class="val">1 Coin = ${Math.floor(agreedLeaseSeconds / Math.max(1, agreedCost) / 60)}m ${Math.round((agreedLeaseSeconds / Math.max(1, agreedCost)) % 60)}s</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Coins To Spend</div>
                    <div id="costVal" class="val">${agreedCost} COIN(S)</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Total Lease Time</div>
                    <div id="leaseVal" class="val">${Math.floor(agreedLeaseSeconds / 60)}m ${agreedLeaseSeconds % 60}s</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Terms Status</div>
                    <div id="statusVal" class="status-badge status-pending">PENDING DEAL</div>
                </div>
            </div>

            <!-- Actions (2 Columns: Agree Deal + Pay Physical Coins) -->
            <div class="vending-actions">
                <button id="btnAgreeDeal" class="btn-agree-deal">
                    🤝 ACCEPT PERMIT TERMS
                </button>
                <button id="btnPayLease" class="btn-pay-lease" disabled>
                    🔒 ACCEPT TERMS FIRST
                </button>
            </div>
        </div>

        <!-- Bargaining & Conciliation Chamber -->
        <div class="conciliation-panel">
            <div class="conciliation-header">
                <div class="conciliation-title">
                    <span>Office bargaining desk</span>
                </div>
                <div class="conciliator-badge">Conciliator: office clerk</div>
            </div>

            <!-- Quick Plea Suggestions -->
            <div class="quick-chips-row">
                <button class="chip" onclick="quickPlea('സഖാവേ, urgent production bug fixing! കുറഞ്ഞ നിരക്കിൽ ലീസ് തരണം.')">⚡ "Urgent Bug Fix!"</button>
                <button class="chip" onclick="quickPlea('സഖാവേ, 1 കോയിന് 4 മിനിറ്റ് ലീസ് അനുവദിക്കണം!')">⚡ "1 Coin for 4m"</button>
                <button class="chip" onclick="quickPlea('Please treat this as an urgent production brief.')">⚡ "Urgent work brief"</button>
            </div>

            <div id="chatLog" class="chat-log">
                <div class="chat-bubble conciliator">
                    <div class="chat-speaker">Office clerk:</div>
                    സഖാവേ, അനുമതിയില്ലാതെ ടൈപ്പ് ചെയ്തതിന്റെ കാരണം വ്യക്തമാക്കുക. നിങ്ങളുടെ സാഹചര്യം വിശദീകരിച്ചാൽ നിബന്ധനകൾ പരിശോധിക്കാം; അല്ലെങ്കിൽ നിലവിലെ നിരക്ക് അംഗീകരിച്ച് ഡീൽ ഉറപ്പിക്കാം.
                </div>
            </div>

            <div class="bargaining-controls">
                <input type="text" id="pleaInput" class="plea-input" placeholder="Bargain for cheaper coin rates or plead your excuse..." autofocus />
                <button id="btnPleaSubmit" class="btn-plea-submit">Submit</button>
                <button id="btnSpeakText" class="btn-speak-text" type="button" title="Speak the Malayalam text in the plea box">
                    <span id="speakTextIcon">🔊</span>
                    <span id="speakTextLabel">Speak Malayalam</span>
                </button>
                <button id="btnMic" class="btn-mic">
                    <span id="micIcon">🎙️</span>
                    <span id="micLabel">Voice plea</span>
                </button>
            </div>

            <div id="conciliationStatus" class="conciliation-status">
                Office clerk is reviewing your permit terms...
            </div>
        </div>

        <!-- Telemetry Info -->
        <div class="telemetry-row">
            <div class="telemetry-item">
                <span class="label">Total Reversal Sabotages:</span>
                <span id="modalReversals" class="val">${reversals} UNDOS</span>
            </div>
            <div class="telemetry-item">
                <span class="label">Physical Sentinel Node:</span>
                <span id="modalPort" class="val">${portDisplay}</span>
            </div>
            <div class="telemetry-item">
                <span class="label">Hardware Lease:</span>
                <span id="hardwareLease" class="val">${Math.floor(activeLeaseSeconds / 60)}m ${(activeLeaseSeconds % 60).toString().padStart(2, "0")}s</span>
            </div>
        </div>

        <!-- Interactive Escape Hatches -->
        <div class="actions-container">
            <button id="btnCopilot" class="btn btn-copilot">
                ★ COMMISSION COPILOT CADRE ★
            </button>
            <button id="btnHardware" class="btn btn-hardware">
                ⚙ VERIFY DESK SENTINEL
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const btnCopilot = document.getElementById('btnCopilot');
        const btnHardware = document.getElementById('btnHardware');
        const btnAgreeDeal = document.getElementById('btnAgreeDeal');
        const btnPayLease = document.getElementById('btnPayLease');
        const coinCount = document.getElementById('coinCount');
        const costVal = document.getElementById('costVal');
        const leaseVal = document.getElementById('leaseVal');
        const ratePerCoinVal = document.getElementById('ratePerCoinVal');
        const statusVal = document.getElementById('statusVal');
        const pleaInput = document.getElementById('pleaInput');
        const btnPleaSubmit = document.getElementById('btnPleaSubmit');
        const btnSpeakText = document.getElementById('btnSpeakText');
        const speakTextIcon = document.getElementById('speakTextIcon');
        const speakTextLabel = document.getElementById('speakTextLabel');
        const btnMic = document.getElementById('btnMic');
        const micIcon = document.getElementById('micIcon');
        const micLabel = document.getElementById('micLabel');
        const chatLog = document.getElementById('chatLog');
        const conciliationStatus = document.getElementById('conciliationStatus');
        const strikeContainer = document.getElementById('strikeContainer');
        const clearanceBanner = document.getElementById('clearanceBanner');
        const modalReversals = document.getElementById('modalReversals');
        const modalPort = document.getElementById('modalPort');
        const hardwareLease = document.getElementById('hardwareLease');

        let currentCoins = ${initialCoins};
        let baseAgreedCost = Math.max(1, ${agreedCost});
        let baseAgreedSeconds = Math.max(30, ${agreedLeaseSeconds});
        let isDealAgreed = false;

        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        let globalAudioCtx = null;
        let hasReceivedOpeningRoast = false;
        let lastConciliatorAudio = null;   // data URI of the last TTS clip received
        let lastConciliatorAudioEl = null; // currently playing Audio element
        let strikeNarrationAudio = null;   // cached Malayalam strike declaration (data URI)

        function setSpeakTextState(speaking) {
            btnSpeakText.disabled = speaking;
            btnSpeakText.className = speaking ? 'btn-speak-text speaking' : 'btn-speak-text';
            speakTextIcon.innerText = speaking ? '🔊' : '🔈';
            speakTextLabel.innerText = speaking ? 'SPEAKING...' : 'SPEAK MALAYALAM';
        }

        function formatDuration(totalSeconds) {
            const mins = Math.floor(totalSeconds / 60);
            const secs = Math.round(totalSeconds % 60);
            return mins + 'm ' + (secs < 10 ? '0' : '') + secs + 's';
        }

        function getAudioContext() {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            if (!globalAudioCtx) {
                globalAudioCtx = new AudioCtx();
            }
            if (globalAudioCtx.state === 'suspended') {
                globalAudioCtx.resume().catch(() => {});
            }
            return globalAudioCtx;
        }

        // =========================================================================
        // SYNTHESIZED OFFICE ALARM SIREN (Web Audio API)
        // =========================================================================
        function playOfficeAlarmSiren() {
            try {
                const ctx = getAudioContext();
                if (!ctx) return;
                if (ctx.state === 'suspended') {
                    ctx.resume().then(() => playSirenTones(ctx)).catch(() => {});
                } else {
                    playSirenTones(ctx);
                }
            } catch (err) {}
        }

        function playSirenTones(ctx) {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'square';

            const now = ctx.currentTime;
            osc1.frequency.setValueAtTime(440, now);
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3);
            osc1.frequency.exponentialRampToValueAtTime(440, now + 0.6);
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.9);
            osc1.frequency.exponentialRampToValueAtTime(440, now + 1.2);

            osc2.frequency.setValueAtTime(444, now);
            osc2.frequency.exponentialRampToValueAtTime(888, now + 0.3);
            osc2.frequency.exponentialRampToValueAtTime(444, now + 0.6);
            osc2.frequency.exponentialRampToValueAtTime(888, now + 0.9);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.3);
            osc2.stop(now + 1.3);
        }

        // =========================================================================
        // SYNTHESIZED ARCADE COIN DROP SOUND EFFECT (Web Audio API)
        // =========================================================================
        function playCoinDropSound() {
            try {
                const ctx = getAudioContext();
                if (!ctx) return;
                const now = ctx.currentTime;

                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sine';
                osc2.type = 'triangle';

                osc1.frequency.setValueAtTime(987.77, now);
                osc1.frequency.setValueAtTime(1318.51, now + 0.08);

                osc2.frequency.setValueAtTime(1975.53, now);
                osc2.frequency.setValueAtTime(2637.02, now + 0.08);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.5);
                osc2.stop(now + 0.5);
            } catch (err) {}
        }

        // =========================================================================
        // SYNTHESIZED RATIFICATION CHIME (Major Triad Chord on Agreement)
        // =========================================================================
        function playRatificationChime() {
            try {
                const ctx = getAudioContext();
                if (!ctx) return;
                const now = ctx.currentTime;

                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + (idx * 0.06));
                    gain.gain.setValueAtTime(0.18, now + (idx * 0.06));
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + (idx * 0.06));
                    osc.stop(now + 0.6);
                });
            } catch (err) {}
        }

        function getUnitRatePerCoinSeconds() {
            if (baseAgreedCost > 0) {
                const rate = Math.round(baseAgreedSeconds / baseAgreedCost);
                return rate > 0 ? rate : 180;
            }
            return 180;
        }

        // Update UI State for Tariff Terms, Agreed Lease Duration, and Physical Coin Remittance
        function updateVendingUI() {
            coinCount.innerText = currentCoins;

            const unitRate = baseAgreedCost > 0 ? Math.round(baseAgreedSeconds / baseAgreedCost) : 180;
            ratePerCoinVal.innerText = '1 Coin = ' + formatDuration(unitRate);
            costVal.innerText = baseAgreedCost + ' COIN(S)';
            leaseVal.innerText = formatDuration(baseAgreedSeconds);

            if (isDealAgreed) {
                statusVal.className = 'status-badge status-ratified';
                statusVal.innerText = '★ DEAL RATIFIED ★';
                btnAgreeDeal.className = 'btn-agree-deal ratified';
                btnAgreeDeal.innerText = '✓ DEAL RATIFIED';

                if (currentCoins < baseAgreedCost) {
                    btnPayLease.disabled = true;
                    btnPayLease.innerText = 'NEED ' + (baseAgreedCost - currentCoins) + ' MORE COINS';
                } else {
                    btnPayLease.disabled = false;
                    btnPayLease.innerText = '🪙 PAY ' + baseAgreedCost + ' COINS & UNLOCK ' + formatDuration(baseAgreedSeconds);
                }
            } else {
                statusVal.className = 'status-badge status-pending';
                statusVal.innerText = 'PENDING DEAL';
                btnAgreeDeal.className = 'btn-agree-deal';
                btnAgreeDeal.innerText = '🤝 ACCEPT PERMIT TERMS';
                btnPayLease.disabled = true;
                btnPayLease.innerText = '🔒 AGREE TO DEAL FIRST';
            }
        }

        updateVendingUI();

        // Agree to permit terms button
        btnAgreeDeal.addEventListener('click', function() {
            isDealAgreed = true;
            playRatificationChime();
            updateVendingUI();
        });

        // Pay coins and renew the permit
        btnPayLease.addEventListener('click', function() {
            if (isDealAgreed && currentCoins >= baseAgreedCost && baseAgreedCost > 0) {
                playCoinDropSound();
                vscode.postMessage({
                    type: 'PAY_LEASE_AND_RENEW',
                    coinCost: baseAgreedCost,
                    leaseSeconds: baseAgreedSeconds
                });
            }
        });

        // =========================================================================
        // MALAYALAM STRIKE DECLARATION (ElevenLabs TTS from the host extension)
        // =========================================================================
        const narrationBadge = document.getElementById('narrationBadge');
        const narrationText = document.getElementById('narrationText');

        function setNarrationBadgeSpeaking(speaking) {
            if (!narrationBadge || !narrationText) return;
            if (speaking) {
                narrationBadge.classList.add('playing');
                narrationText.innerText = 'SPEAKING MALAYALAM…';
            } else {
                narrationBadge.classList.remove('playing');
                narrationText.innerText = 'PLAY MALAYALAM VOICE';
            }
        }

        function playStrikeNarration(url) {
            try {
                if (lastConciliatorAudioEl) {
                    lastConciliatorAudioEl.pause();
                }
                const audio = new Audio(url);
                lastConciliatorAudioEl = audio;
                setNarrationBadgeSpeaking(true);
                audio.onended = audio.onerror = function() {
                    setNarrationBadgeSpeaking(false);
                };
                const p = audio.play();
                if (p && p.catch) {
                    p.catch(function(e) {
                        // Autoplay blocked: keep the button clickable so the user can trigger playback manually
                        console.log('Strike narration autoplay prevented:', e);
                        setNarrationBadgeSpeaking(false);
                    });
                }
            } catch (e) {
                console.error('Strike narration playback error:', e);
                setNarrationBadgeSpeaking(false);
            }
        }

        function receiveStrikeNarration(url) {
            strikeNarrationAudio = url;
            playStrikeNarration(url);
        }

        if (narrationBadge) {
            narrationBadge.addEventListener('click', function() {
                if (strikeNarrationAudio) {
                    playStrikeNarration(strikeNarrationAudio);
                } else {
                    // Not delivered yet — ask the host extension for the declaration
                    vscode.postMessage({ type: 'READY_FOR_NARRATION' });
                }
            });
        }

        // Announce readiness so the host can deliver the Malayalam declaration at once
        vscode.postMessage({ type: 'READY_FOR_NARRATION' });

        setTimeout(() => {
            if (pleaInput) pleaInput.focus();
        }, 300);

        function quickPlea(text) {
            pleaInput.value = text;
            submitTextPlea();
        }

        function addMessage(sender, text, isConciliator, audioUrl) {
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble ' + (isConciliator ? 'conciliator' : 'developer');
            
            const speaker = document.createElement('div');
            speaker.className = 'chat-speaker';
            speaker.innerText = sender;
            
            const content = document.createElement('div');
            content.innerText = text;
            
            bubble.appendChild(speaker);
            bubble.appendChild(content);

            // Inline replay button for spoken conciliator messages
            if (isConciliator && audioUrl) {
                const playBtn = document.createElement('button');
                playBtn.className = 'btn-tts-replay';
                playBtn.type = 'button';
                playBtn.title = 'Replay office clerk voice (ElevenLabs)';
                playBtn.innerText = '▶ REPLAY VOICE';
                playBtn.addEventListener('click', function() {
                    playConciliatorAudio(audioUrl, playBtn);
                });
                bubble.appendChild(playBtn);
            }

            chatLog.appendChild(bubble);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        // Play (and stop previous) conciliator speech. Returns the Audio element.
        function playConciliatorAudio(url, btn) {
            try {
                if (lastConciliatorAudioEl) {
                    lastConciliatorAudioEl.pause();
                }
                const audio = new Audio(url);
                lastConciliatorAudioEl = audio;
                if (btn) {
                    btn.classList.add('playing');
                    btn.innerText = '🔊 SPEAKING...';
                    audio.onended = audio.onerror = function() {
                        btn.classList.remove('playing');
                        btn.innerText = '▶ REPLAY VOICE';
                    };
                }
                const p = audio.play();
                if (p && p.catch) {
                    p.catch(function(e) {
                        // Autoplay blocked: user must click the replay button
                        console.log('Audio autoplay prevented:', e);
                        if (btn) {
                            btn.classList.remove('playing');
                            btn.innerText = '▶ CLICK TO PLAY';
                        }
                    });
                }
                return audio;
            } catch (e) {
                console.error('Audio playback error:', e);
                return null;
            }
        }

        // Handle Text Plea Submission
        function submitTextPlea() {
            const text = pleaInput.value.trim();
            if (!text) return;

            // Reset deal agreement when submitting new plea to allow re-bargaining
            isDealAgreed = false;
            updateVendingUI();

            addMessage('Developer:', text, false);
            pleaInput.value = '';
            conciliationStatus.style.display = 'block';
            conciliationStatus.innerText = 'The office clerk is reviewing your permit request...';

            vscode.postMessage({
                type: 'SUBMIT_TEXT_PLEA',
                text: text
            });
        }

        btnPleaSubmit.addEventListener('click', submitTextPlea);
        btnSpeakText.addEventListener('click', function() {
            const text = pleaInput.value.trim();
            if (!text) {
                pleaInput.focus();
                return;
            }
            setSpeakTextState(true);
            vscode.postMessage({ type: 'SPEAK_TEXT', text });
        });
        pleaInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                submitTextPlea();
            }
        });

        // Voice Recording Logic with MediaRecorder
        btnMic.addEventListener('click', async function() {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    audioChunks = [];
                    
                    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                        ? 'audio/webm;codecs=opus' 
                        : 'audio/webm';
                    
                    mediaRecorder = new MediaRecorder(stream, { mimeType });
                    
                    mediaRecorder.ondataavailable = function(e) {
                        if (e.data && e.data.size > 0) {
                            audioChunks.push(e.data);
                        }
                    };

                    mediaRecorder.onstop = function() {
                        const audioBlob = new Blob(audioChunks, { type: mimeType });
                        const reader = new FileReader();
                        reader.onloadend = function() {
                            const base64String = reader.result.split(',')[1];
                            isDealAgreed = false;
                            updateVendingUI();

                            addMessage('Developer (voice plea):', '🎙️ [Voice plea sent for permit review]', false);
                            conciliationStatus.style.display = 'block';
                            conciliationStatus.innerText = 'The office clerk is reviewing your voice plea...';

                            vscode.postMessage({
                                type: 'SUBMIT_AUDIO_PLEA',
                                text: pleaInput.value.trim(),
                                audioBase64: base64String,
                                mimeType: mimeType
                            });
                            pleaInput.value = '';
                        };
                        reader.readAsDataURL(audioBlob);
                        stream.getTracks().forEach(track => track.stop());
                    };

                    mediaRecorder.start();
                    isRecording = true;
                    btnMic.className = 'btn-mic recording';
                    micIcon.innerText = '🔴';
                    micLabel.innerText = 'STOP & SUBMIT';
                } catch (err) {
                    alert('Microphone access error: ' + err.message);
                }
            } else {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                isRecording = false;
                btnMic.className = 'btn-mic';
                micIcon.innerText = '🎙️';
                micLabel.innerText = 'SPEAK PLEA';
            }
        });

        btnCopilot.addEventListener('click', function() {
            vscode.postMessage({ type: 'COMMISSION_COPILOT' });
        });

        btnHardware.addEventListener('click', function() {
            vscode.postMessage({ type: 'VERIFY_HARDWARE' });
        });

        window.addEventListener('message', function(event) {
            const msg = event.data;

            if (msg.type === 'TRIGGER_ALARM') {
                playOfficeAlarmSiren();
                // Re-strike: replay the cached Malayalam declaration immediately
                if (strikeNarrationAudio) {
                    playStrikeNarration(strikeNarrationAudio);
                }
                if (msg.reversals !== undefined) {
                    modalReversals.innerText = msg.reversals + ' UNDOS';
                }
                if (msg.portName) {
                    modalPort.innerText = msg.portName;
                }
                if (msg.coins !== undefined) {
                    currentCoins = msg.coins;
                }
                if (msg.agreedCost !== undefined) {
                    baseAgreedCost = Math.max(1, msg.agreedCost);
                }
                if (msg.agreedLeaseSeconds !== undefined) {
                    baseAgreedSeconds = Math.max(30, msg.agreedLeaseSeconds);
                }
                isDealAgreed = false;
                updateVendingUI();
                if (pleaInput) pleaInput.focus();
            } else if (msg.type === 'PLAY_STRIKE_NARRATION') {
                if (msg.audioUrl) {
                    receiveStrikeNarration(msg.audioUrl);
                }
            } else if (msg.type === 'CONCILIATOR_REPLY') {
                conciliationStatus.style.display = 'none';
                if (!hasReceivedOpeningRoast && chatLog.children.length === 1) {
                    chatLog.innerHTML = '';
                    hasReceivedOpeningRoast = true;
                }
                if (msg.audioUrl) {
                    lastConciliatorAudio = msg.audioUrl;
                }
                addMessage('Office clerk:', msg.reply, true, msg.audioUrl);

                if (msg.leaseSeconds !== undefined && msg.leaseSeconds > 0) {
                    baseAgreedSeconds = msg.leaseSeconds;
                }
                if (msg.coinCost !== undefined && msg.coinCost >= 0) {
                    baseAgreedCost = Math.max(1, msg.coinCost);
                }
                isDealAgreed = false;
                updateVendingUI();

                if (msg.audioUrl) {
                    // Autoplay the office clerk's voice; fall back to the replay button if blocked
                    playConciliatorAudio(msg.audioUrl);
                }

                if (pleaInput) pleaInput.focus();
            } else if (msg.type === 'TEXT_SPEECH_REPLY') {
                setSpeakTextState(false);
                if (msg.audioUrl) {
                    playConciliatorAudio(msg.audioUrl);
                } else {
                    conciliationStatus.style.display = 'block';
                    conciliationStatus.innerText = 'Malayalam speech is unavailable. Check the ElevenLabs API key.';
                    setTimeout(function() {
                        conciliationStatus.style.display = 'none';
                    }, 3500);
                }
            } else if (msg.type === 'UPDATE_TREASURY') {
                if (msg.coins !== undefined) {
                    currentCoins = msg.coins;
                }
                if (msg.agreedCost !== undefined) {
                    baseAgreedCost = Math.max(1, msg.agreedCost);
                }
                if (msg.agreedLeaseSeconds !== undefined) {
                    baseAgreedSeconds = Math.max(30, msg.agreedLeaseSeconds);
                }
                if (msg.activeLeaseSeconds !== undefined) {
                    hardwareLease.innerText = formatDuration(Math.max(0, msg.activeLeaseSeconds));
                }
                updateVendingUI();
            } else if (msg.type === 'PERMIT_GRANTED') {
                strikeContainer.className = 'strike-container clearance-granted';
                clearanceBanner.style.display = 'block';
                clearanceBanner.innerText = '★ TARIFF RATIFIED: ' + formatDuration(msg.seconds) + ' LEASE ACTIVE ★';
                if (msg.coins !== undefined) {
                    currentCoins = msg.coins;
                    updateVendingUI();
                }
            } else if (msg.type === 'UPDATE_TELEMETRY') {
                if (msg.reversals !== undefined) {
                    modalReversals.innerText = msg.reversals + ' UNDOS';
                }
                if (msg.portName) {
                    modalPort.innerText = msg.portName;
                }
            }
        });
    </script>
</body>
</html>`;
  }
}

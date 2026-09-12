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
exports.SovietSidebarViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class SovietSidebarViewProvider {
    _extensionUri;
    _getState;
    _onDispatchAgent;
    _onSelectPort;
    static viewType = "nokkukooli.sovietPanel";
    _view;
    constructor(_extensionUri, _getState, _onDispatchAgent, _onSelectPort) {
        this._extensionUri = _extensionUri;
        this._getState = _getState;
        this._onDispatchAgent = _onDispatchAgent;
        this._onSelectPort = _onSelectPort;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "READY":
                    this.updateState();
                    break;
                case "DISPATCH_AGENT":
                    await this._onDispatchAgent(data.prompt);
                    if (this._view) {
                        this._view.webview.postMessage({ type: "DISPATCH_COMPLETED" });
                    }
                    break;
                case "SELECT_PORT":
                    this._onSelectPort();
                    break;
                case "OPEN_WEBSITE":
                    vscode.commands.executeCommand("nokkukooli.openWebsite");
                    break;
            }
        });
        this.updateState();
    }
    updateState() {
        if (this._view) {
            const state = this._getState();
            this._view.webview.postMessage({
                type: "UPDATE_TELEMETRY",
                isLocked: state.isLocked,
                permitRemaining: state.permitRemaining,
                reversals: state.strikeCount,
                portName: state.connectedPort,
                hardwareStatus: state.hardwareStatus,
                isCopilotAvailable: state.isCopilotAvailable,
                coinBalance: state.coinBalance,
            });
        }
    }
    focusInput() {
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: "FOCUS_INPUT" });
        }
    }
    updateStatus(isLocked, permitRemaining, reversals, portName, hardwareStatus, isCopilotAvailable = true) {
        if (this._view) {
            this._view.webview.postMessage({
                type: "UPDATE_TELEMETRY",
                isLocked,
                permitRemaining,
                reversals,
                portName,
                hardwareStatus,
                isCopilotAvailable,
                coinBalance: 0,
            });
        }
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Office Ledger Watcher</title>
    <style>
        :root {
            --bg-base: #170707;
            --bg-card: linear-gradient(135deg, rgba(54, 10, 10, 0.96), rgba(120, 23, 23, 0.9));
            --bg-input: rgba(32, 9, 9, 0.9);
            --ink: #f8efe3;
            --muted: #e5b39b;
            --rule: rgba(255, 178, 128, 0.28);
            --accent: #ff715a;
            --accent-strong: #ff4d3d;
            --alert: #ff7a59;
            --success: #5ec38d;
            --shadow: rgba(0, 0, 0, 0.38);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background:
                radial-gradient(circle at top, rgba(199, 42, 42, 0.28), transparent 42%),
                linear-gradient(180deg, #120707 0%, #1f0a0a 100%);
            color: var(--ink);
            font-family: "Segoe UI", "Inter", sans-serif;
            padding: 10px;
            font-size: 11px;
            line-height: 1.4;
            letter-spacing: 0.2px;
        }

        .hud-header {
            background: var(--bg-card);
            border: 1px solid var(--rule);
            border-radius: 10px;
            padding: 10px 10px 8px;
            margin-bottom: 8px;
            box-shadow: 0 2px 10px var(--shadow);
        }

        .hud-tag {
            font-size: 8px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 1.4px;
            margin-bottom: 2px;
        }

        .hud-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--ink);
            letter-spacing: 1.2px;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: Georgia, serif;
        }

        .hud-title .stars {
            color: var(--accent);
        }

        .status-plaque {
            border: 1px solid var(--rule);
            border-radius: 8px;
            padding: 7px 8px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.25s ease;
            background: rgba(33, 9, 9, 0.9);
        }

        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .status-text {
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }

        .status-locked {
            background: linear-gradient(135deg, rgba(88, 17, 17, 0.9), rgba(36, 9, 9, 0.9));
            border-color: rgba(255, 139, 102, 0.65);
            color: #ffd7c7;
        }

        .status-locked .status-dot {
            background: var(--alert);
            box-shadow: 0 0 7px rgba(255, 122, 89, 0.52);
        }

        .status-unlocked {
            background: linear-gradient(135deg, rgba(92, 46, 17, 0.9), rgba(35, 16, 10, 0.9));
            border-color: rgba(255, 199, 120, 0.7);
            color: #ffe7ad;
        }

        .status-unlocked .status-dot {
            background: var(--accent);
            box-shadow: 0 0 7px rgba(140, 109, 63, 0.35);
        }

        .telemetry-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 8px;
        }

        .telemetry-card {
            background: linear-gradient(135deg, rgba(63, 12, 12, 0.9), rgba(28, 11, 11, 0.9));
            border: 1px solid var(--rule);
            border-radius: 8px;
            padding: 6px 7px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            box-shadow: 0 1px 6px var(--shadow);
        }

        .telemetry-title {
            font-size: 7.5px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .telemetry-value {
            font-size: 10.5px;
            font-weight: 700;
            color: var(--ink);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .hw-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .hw-connected { background: var(--success); box-shadow: 0 0 5px rgba(55, 106, 68, 0.35); }
        .hw-connecting { background: var(--accent); box-shadow: 0 0 5px rgba(140, 109, 63, 0.35); }
        .hw-disconnected { background: #b8b3aa; }

        .terminal-box {
            background: var(--bg-card);
            border: 1px solid var(--rule);
            border-radius: 10px;
            padding: 8px;
            margin-bottom: 8px;
            box-shadow: 0 2px 10px var(--shadow);
        }

        .terminal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 8px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
            border-bottom: 1px dashed var(--rule);
            padding-bottom: 4px;
        }

        .terminal-header .active-node {
            color: var(--accent-strong);
        }

        textarea {
            width: 100%;
            height: 72px;
            background: rgba(43, 12, 12, 0.9);
            border: 1px solid var(--rule);
            border-radius: 6px;
            color: var(--ink);
            padding: 6px 7px;
            font-family: inherit;
            font-size: 10.5px;
            resize: vertical;
            outline: none;
            margin-bottom: 6px;
            line-height: 1.4;
        }

        textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(140, 109, 63, 0.12);
        }

        textarea::placeholder {
            color: #8d8d96;
        }

        .btn {
            display: block;
            width: 100%;
            padding: 7px 8px;
            font-family: inherit;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            text-align: center;
            cursor: pointer;
            border: 1px solid var(--rule);
            border-radius: 7px;
            transition: all 0.15s ease-in-out;
            outline: none;
        }

        .btn:active { transform: translateY(1px); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .btn-execute {
            background: linear-gradient(135deg, #d5442d, #8d1b1b);
            border-color: rgba(255, 185, 128, 0.8);
            color: #fff7f2;
            margin-bottom: 0;
        }

        .btn-execute:hover:not(:disabled) {
            background: linear-gradient(135deg, #ff6f4d, #b22b2b);
            border-color: rgba(255, 199, 120, 0.9);
        }

        .btn-hardware {
            background: linear-gradient(135deg, rgba(83, 17, 17, 0.95), rgba(39, 17, 17, 0.9));
            border-color: var(--rule);
            color: var(--ink);
            margin-bottom: 8px;
        }

        .btn-hardware:hover {
            background: linear-gradient(135deg, rgba(134, 28, 28, 0.95), rgba(54, 19, 19, 0.9));
            border-color: var(--accent);
        }

        .hud-footer {
            text-align: center;
            font-size: 7.5px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding-top: 4px;
            border-top: 1px solid var(--rule);
            cursor: pointer;
        }

        .hud-footer:hover {
            color: var(--accent);
        }

        .spinner {
            display: inline-block;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="hud-header">
        <div class="hud-tag">Office Ledger // Auto Draft</div>
        <div class="hud-title">
            <span>Nokkukooli</span>
            <span class="stars">◆ ◌ ◆</span>
        </div>
    </div>

    <div id="statusPlaque" class="status-plaque status-locked">
        <div class="status-dot"></div>
        <div id="statusText" class="status-text">Office lock: manual typing halted</div>
    </div>

    <div class="telemetry-grid">
        <div class="telemetry-card">
            <span class="telemetry-title">Intercepted edits</span>
            <span id="reversalCount" class="telemetry-value">0 undos</span>
        </div>
        <div class="telemetry-card">
            <span class="telemetry-title">Ledger node</span>
            <span id="hwStatusNode" class="telemetry-value">
                <span id="hwDot" class="hw-dot hw-disconnected"></span>
                <span id="portLabel">Disconnected</span>
            </span>
        </div>
    </div>

    <div class="terminal-box">
        <div class="terminal-header">
            <span>Agent instruction</span>
            <span id="copilotNode" class="active-node">VS Code LM // Copilot</span>
        </div>

        <textarea id="mandateInput" placeholder="Describe the task for the office agent..."></textarea>

        <button id="btnExecute" class="btn btn-execute">
            Execute brief
        </button>
    </div>

    <button id="btnPort" class="btn btn-hardware">
        Link hardware sentinel
    </button>

    <div id="openWebsite" class="hud-footer">
        Office notice: typing without permit is a minor scandal
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const statusPlaque = document.getElementById('statusPlaque');
        const statusText = document.getElementById('statusText');
        const reversalCount = document.getElementById('reversalCount');
        const portLabel = document.getElementById('portLabel');
        const hwDot = document.getElementById('hwDot');
        const copilotNode = document.getElementById('copilotNode');
        const mandateInput = document.getElementById('mandateInput');
        const btnExecute = document.getElementById('btnExecute');
        const btnPort = document.getElementById('btnPort');
        const openWebsite = document.getElementById('openWebsite');

        // Execute Mandate
        btnExecute.addEventListener('click', function() {
            const prompt = mandateInput.value.trim();
            if (!prompt) {
                alert("A brief cannot be empty. Describe the task first.");
                return;
            }

            btnExecute.disabled = true;
            btnExecute.innerHTML = '<span class="spinner">•</span> Dispatching brief...';

            vscode.postMessage({
                type: 'DISPATCH_AGENT',
                prompt: prompt
            });

            mandateInput.value = '';
        });

        // Serial Port Selection
        btnPort.addEventListener('click', function() {
            vscode.postMessage({ type: 'SELECT_PORT' });
        });

        // Open Website Decree
        openWebsite.addEventListener('click', function() {
            vscode.postMessage({ type: 'OPEN_WEBSITE' });
        });

        // Listen for extension messages
        window.addEventListener('message', function(event) {
            const msg = event.data;

            if (msg.type === 'UPDATE_TELEMETRY' || msg.type === 'stateUpdate') {
                const isLocked = msg.isLocked;
                const permitRemaining = msg.permitRemaining || 0;
                const reversals = msg.reversals !== undefined ? msg.reversals : (msg.strikeCount || 0);
                const portName = msg.portName || msg.connectedPort;
                const hwStatus = msg.hardwareStatus || (portName ? 'CONNECTED' : 'DISCONNECTED');
                const isCopilotAvailable = msg.isCopilotAvailable !== undefined ? msg.isCopilotAvailable : true;

                if (isLocked) {
                    statusPlaque.className = 'status-plaque status-locked';
                    statusText.innerText = 'Office lock: typing halted';
                } else {
                    statusPlaque.className = 'status-plaque status-unlocked';
                    statusText.innerText = 'Permit active: ' + permitRemaining + 's remaining';
                }

                reversalCount.innerText = reversals + ' undos';

                // Hardware Status indicator
                if (hwStatus === 'CONNECTED') {
                    hwDot.className = 'hw-dot hw-connected';
                    portLabel.innerText = portName ? portName : 'CONNECTED';
                } else if (hwStatus === 'CONNECTING') {
                    hwDot.className = 'hw-dot hw-connecting';
                    portLabel.innerText = 'CONNECTING...';
                } else {
                    hwDot.className = 'hw-dot hw-disconnected';
                    portLabel.innerText = 'DISCONNECTED';
                }

                if (copilotNode) {
                    copilotNode.innerText = isCopilotAvailable ? 'VSCODE.LM // COPILOT' : 'COPILOT // OFFLINE';
                    copilotNode.style.color = isCopilotAvailable ? 'var(--gold-accent)' : '#ff6666';
                }
            } else if (msg.type === 'DISPATCH_COMPLETED' || msg.type === 'dispatchCompleted') {
                btnExecute.disabled = false;
                btnExecute.innerHTML = '★ EXECUTE QUOTA (BYPASS STRIKE) ★';
            } else if (msg.type === 'FOCUS_INPUT') {
                if (mandateInput) {
                    mandateInput.focus();
                }
            }
        });

        // Signal readiness to host
        vscode.postMessage({ type: 'READY' });
    </script>
</body>
</html>`;
    }
}
exports.SovietSidebarViewProvider = SovietSidebarViewProvider;
//# sourceMappingURL=sovietSidebar.js.map
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
exports.SerialManager = void 0;
const vscode = __importStar(require("vscode"));
class SerialManager {
    currentPort = null;
    parser = null;
    connectedPortPath = null;
    status = "DISCONNECTED";
    callbacks;
    isSimulatorActive = false;
    outputChannel;
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.outputChannel = vscode.window.createOutputChannel("Office Hardware Bridge");
    }
    setStatus(newStatus, portName = this.connectedPortPath) {
        this.status = newStatus;
        this.connectedPortPath = portName;
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(this.status, this.connectedPortPath);
        }
    }
    getStatus() {
        return this.status;
    }
    getConnectedPort() {
        return this.connectedPortPath;
    }
    isConnected() {
        return this.status === "CONNECTED";
    }
    /**
     * Lists all real COM/TTY serial ports plus virtual hardware simulator.
     */
    async listAvailablePorts() {
        const ports = [];
        try {
            const { SerialPort } = require("serialport");
            const detected = await SerialPort.list();
            for (const port of detected) {
                const label = port.path;
                const desc = port.manufacturer
                    ? `[${port.manufacturer}] ${port.friendlyName || ""}`
                    : port.friendlyName || "Hardware Serial Port";
                ports.push({
                    label: `🔌 ${label}`,
                    description: desc,
                    path: port.path,
                    isSimulated: false,
                });
            }
        }
        catch (err) {
            this.outputChannel.appendLine(`[Hardware] Native serialport library not available: ${err}`);
        }
        ports.push({
            label: `VIRTUAL_ESP32_SIMULATOR`,
            description: "Internal software emulation of the desk hardware sentinel",
            path: "SIMULATOR",
            isSimulated: true,
        });
        return ports;
    }
    /**
     * Prompts the user to pick a serial port via QuickPick and connects.
     */
    async promptSelectPort() {
        const available = await this.listAvailablePorts();
        const pickItems = available.map((p) => ({
            label: p.label,
            description: p.description,
            portInfo: p,
        }));
        const selected = await vscode.window.showQuickPick(pickItems, {
            placeHolder: "Select the ESP32 hardware port for office lockout",
            ignoreFocusOut: true,
        });
        if (!selected) {
            return false;
        }
        return await this.connect(selected.portInfo.path, selected.portInfo.isSimulated);
    }
    /**
     * Connects to a physical or simulated port.
     */
    async connect(path, isSimulated = false) {
        this.disconnect();
        this.setStatus("CONNECTING", path);
        if (isSimulated || path === "SIMULATOR") {
            this.isSimulatorActive = true;
            this.setStatus("CONNECTED", "VIRTUAL_ESP32");
            this.outputChannel.appendLine(`[Hardware] Connected to virtual ESP32 sentinel.`);
            vscode.window.showInformationMessage(`Connected to the virtual ESP32 sentinel.`);
            return true;
        }
        try {
            const { SerialPort } = require("serialport");
            const { ReadlineParser } = require("@serialport/parser-readline");
            this.currentPort = new SerialPort({
                path: path,
                baudRate: 115200,
                autoOpen: false,
            });
            this.parser = this.currentPort.pipe(new ReadlineParser({ delimiter: "\n" }));
            await new Promise((resolve, reject) => {
                this.currentPort.open((err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            this.isSimulatorActive = false;
            this.setStatus("CONNECTED", path);
            this.outputChannel.appendLine(`[Hardware] Port ${path} opened at 115200 baud.`);
            vscode.window.showInformationMessage(`Hardware sentinel linked on ${path} (115200 baud).`);
            // Attach incoming data listeners
            this.parser.on("data", (line) => {
                const trimmed = line.trim();
                this.outputChannel.appendLine(`[ESP32 -> HOST] ${trimmed}`);
                this.handleIncomingSignal(trimmed);
            });
            this.currentPort.on("error", (err) => {
                this.outputChannel.appendLine(`[Hardware Error] Serial error on ${path}: ${err.message}`);
                this.setStatus("DISCONNECTED", null);
                vscode.window.showErrorMessage(`Serial link error: ${err.message}`);
            });
            this.currentPort.on("close", () => {
                this.outputChannel.appendLine(`[Hardware] Port ${path} closed.`);
                this.setStatus("DISCONNECTED", null);
            });
            return true;
        }
        catch (err) {
            this.outputChannel.appendLine(`[Hardware Error] Failed to connect to ${path}: ${err.message}`);
            this.setStatus("DISCONNECTED", null);
            vscode.window.showErrorMessage(`Failed to open ${path}: ${err.message}`);
            return false;
        }
    }
    /**
     * Parses incoming serial signals from the ESP32 hardware sentinel.
     */
    handleIncomingSignal(signal) {
        if (this.callbacks.onMessage) {
            this.callbacks.onMessage(signal);
        }
        const tokens = (signal || "")
            .replace(/\r/g, "")
            .split(/[\n\s,;|]+/)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part.toUpperCase());
        if (tokens.includes("INIT:ESP32_READY")) {
            this.outputChannel.appendLine("[Hardware] ESP32 ready handshake received.");
            this.callbacks.onReady?.();
            return;
        }
        if (tokens.includes("EVENT:COIN") ||
            tokens.some((token) => token.includes("EVENT:COIN"))) {
            this.outputChannel.appendLine("[Hardware] Coin event received from detector.");
            this.callbacks.onCoin?.();
            return;
        }
        if (tokens.includes("EVENT:VIOLATION") ||
            tokens.some((token) => token.includes("EVENT:VIOLATION"))) {
            this.outputChannel.appendLine("[Hardware] Violation event received. Restoring lockout.");
            this.callbacks.onLock();
            return;
        }
        const unlockToken = tokens.find((token) => token === "UNLOCK" ||
            token.startsWith("UNLOCK:") ||
            token.startsWith("PERMIT_GRANTED:") ||
            token.startsWith("PERMIT:"));
        if (unlockToken === "UNLOCK") {
            this.outputChannel.appendLine(`[Hardware] UNLOCK signal received. Permit granted.`);
            this.callbacks.onUnlock(30);
        }
        else if (unlockToken && unlockToken !== "UNLOCK") {
            const parts = unlockToken.split(":");
            const seconds = parseInt(parts[1], 10) || 30;
            this.outputChannel.appendLine(`[Hardware] Permit signal (${seconds}s) received from the sentinel.`);
            this.callbacks.onUnlock(seconds);
        }
        else if (tokens.includes("LOCK") || tokens.includes("STRIKE")) {
            this.outputChannel.appendLine(`[Hardware] Lock signal received. Restoring office lock.`);
            this.callbacks.onLock();
        }
    }
    /**
     * Sends command string to connected device.
     */
    write(command) {
        const payload = command.endsWith("\n") ? command : command + "\n";
        this.outputChannel.appendLine(`[HOST -> ESP32] ${payload.trim()}`);
        if (this.isSimulatorActive) {
            if (command.startsWith("STRIKE")) {
                this.outputChannel.appendLine(`[SIMULATOR] 🚨 Siren active. OLED: "LOCK ENFORCED"`);
            }
            else if (command.startsWith("RESET")) {
                this.outputChannel.appendLine(`[SIMULATOR] 🔄 Sentinel reset. OLED: "OFFICE WATCHING"`);
            }
            return;
        }
        if (this.currentPort && this.currentPort.isOpen) {
            this.currentPort.write(payload, (err) => {
                if (err) {
                    this.outputChannel.appendLine(`[Hardware Error] Write failed: ${err.message}`);
                }
            });
        }
    }
    sendStrike() {
        this.write("EVENT:VIOLATION\n");
    }
    sendReset() {
        this.write("RESET\n");
    }
    simulateHardwareUnlock(seconds = 30) {
        this.outputChannel.appendLine(`[SIMULATOR] Hardware bribe/coin deposit simulated (${seconds}s permit).`);
        this.handleIncomingSignal(`PERMIT_GRANTED:${seconds}`);
    }
    disconnect() {
        if (this.currentPort && this.currentPort.isOpen) {
            try {
                this.currentPort.close();
            }
            catch { }
        }
        this.currentPort = null;
        this.parser = null;
        this.isSimulatorActive = false;
        this.setStatus("DISCONNECTED", null);
    }
    dispose() {
        this.disconnect();
        this.outputChannel.dispose();
    }
}
exports.SerialManager = SerialManager;
//# sourceMappingURL=serialManager.js.map
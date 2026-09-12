import * as vscode from "vscode";

export type HardwareStatus = "CONNECTED" | "DISCONNECTED" | "CONNECTING";

interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  friendlyName?: string;
  vendorId?: string;
  productId?: string;
}

export interface SerialCallbacks {
  onUnlock: (seconds: number) => void;
  onLock: () => void;
  onCoin?: () => void;
  onReady?: () => void;
  onStatusChange?: (status: HardwareStatus, portName: string | null) => void;
  onMessage?: (raw: string) => void;
}

export class SerialManager {
  private currentPort: any = null;
  private parser: any = null;
  private connectedPortPath: string | null = null;
  private status: HardwareStatus = "DISCONNECTED";
  private callbacks: SerialCallbacks;
  private isSimulatorActive: boolean = false;
  private outputChannel: vscode.OutputChannel;

  constructor(callbacks: SerialCallbacks) {
    this.callbacks = callbacks;
    this.outputChannel = vscode.window.createOutputChannel(
      "Office Hardware Bridge",
    );
  }

  private setStatus(
    newStatus: HardwareStatus,
    portName: string | null = this.connectedPortPath,
  ) {
    this.status = newStatus;
    this.connectedPortPath = portName;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(this.status, this.connectedPortPath);
    }
  }

  public getStatus(): HardwareStatus {
    return this.status;
  }

  public getConnectedPort(): string | null {
    return this.connectedPortPath;
  }

  public isConnected(): boolean {
    return this.status === "CONNECTED";
  }

  /**
   * Lists all real COM/TTY serial ports plus virtual hardware simulator.
   */
  public async listAvailablePorts(): Promise<
    Array<{
      label: string;
      description: string;
      path: string;
      isSimulated: boolean;
    }>
  > {
    const ports: Array<{
      label: string;
      description: string;
      path: string;
      isSimulated: boolean;
    }> = [];

    try {
      const { SerialPort } = require("serialport");
      const detected: SerialPortInfo[] = await SerialPort.list();

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
    } catch (err) {
      this.outputChannel.appendLine(
        `[Hardware] Native serialport library not available: ${err}`,
      );
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
  public async promptSelectPort(): Promise<boolean> {
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

    return await this.connect(
      selected.portInfo.path,
      selected.portInfo.isSimulated,
    );
  }

  /**
   * Connects to a physical or simulated port.
   */
  public async connect(
    path: string,
    isSimulated: boolean = false,
  ): Promise<boolean> {
    this.disconnect();
    this.setStatus("CONNECTING", path);

    if (isSimulated || path === "SIMULATOR") {
      this.isSimulatorActive = true;
      this.setStatus("CONNECTED", "VIRTUAL_ESP32");
      this.outputChannel.appendLine(
        `[Hardware] Connected to virtual ESP32 sentinel.`,
      );
      vscode.window.showInformationMessage(
        `Connected to the virtual ESP32 sentinel.`,
      );
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

      this.parser = this.currentPort.pipe(
        new ReadlineParser({ delimiter: "\n" }),
      );

      await new Promise<void>((resolve, reject) => {
        this.currentPort.open((err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isSimulatorActive = false;
      this.setStatus("CONNECTED", path);

      this.outputChannel.appendLine(
        `[Hardware] Port ${path} opened at 115200 baud.`,
      );
      vscode.window.showInformationMessage(
        `Hardware sentinel linked on ${path} (115200 baud).`,
      );

      // Attach incoming data listeners
      this.parser.on("data", (line: string) => {
        const trimmed = line.trim();
        this.outputChannel.appendLine(`[ESP32 -> HOST] ${trimmed}`);
        this.handleIncomingSignal(trimmed);
      });

      this.currentPort.on("error", (err: Error) => {
        this.outputChannel.appendLine(
          `[Hardware Error] Serial error on ${path}: ${err.message}`,
        );
        this.setStatus("DISCONNECTED", null);
        vscode.window.showErrorMessage(`Serial link error: ${err.message}`);
      });

      this.currentPort.on("close", () => {
        this.outputChannel.appendLine(`[Hardware] Port ${path} closed.`);
        this.setStatus("DISCONNECTED", null);
      });

      return true;
    } catch (err: any) {
      this.outputChannel.appendLine(
        `[Hardware Error] Failed to connect to ${path}: ${err.message}`,
      );
      this.setStatus("DISCONNECTED", null);
      vscode.window.showErrorMessage(`Failed to open ${path}: ${err.message}`);
      return false;
    }
  }

  /**
   * Parses incoming serial signals from the ESP32 hardware sentinel.
   */
  private handleIncomingSignal(signal: string) {
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
      this.outputChannel.appendLine(
        "[Hardware] ESP32 ready handshake received.",
      );
      this.callbacks.onReady?.();
      return;
    }

    if (
      tokens.includes("EVENT:COIN") ||
      tokens.some((token) => token.includes("EVENT:COIN"))
    ) {
      this.outputChannel.appendLine(
        "[Hardware] Coin event received from detector.",
      );
      this.callbacks.onCoin?.();
      return;
    }

    if (
      tokens.includes("EVENT:VIOLATION") ||
      tokens.some((token) => token.includes("EVENT:VIOLATION"))
    ) {
      this.outputChannel.appendLine(
        "[Hardware] Violation event received. Restoring lockout.",
      );
      this.callbacks.onLock();
      return;
    }

    const unlockToken = tokens.find(
      (token) =>
        token === "UNLOCK" ||
        token.startsWith("UNLOCK:") ||
        token.startsWith("PERMIT_GRANTED:") ||
        token.startsWith("PERMIT:"),
    );

    if (unlockToken === "UNLOCK") {
      this.outputChannel.appendLine(
        `[Hardware] UNLOCK signal received. Permit granted.`,
      );
      this.callbacks.onUnlock(30);
    } else if (unlockToken && unlockToken !== "UNLOCK") {
      const parts = unlockToken.split(":");
      const seconds = parseInt(parts[1], 10) || 30;
      this.outputChannel.appendLine(
        `[Hardware] Permit signal (${seconds}s) received from the sentinel.`,
      );
      this.callbacks.onUnlock(seconds);
    } else if (tokens.includes("LOCK") || tokens.includes("STRIKE")) {
      this.outputChannel.appendLine(
        `[Hardware] Lock signal received. Restoring office lock.`,
      );
      this.callbacks.onLock();
    }
  }

  /**
   * Sends command string to connected device.
   */
  public write(command: string) {
    const payload = command.endsWith("\n") ? command : command + "\n";
    this.outputChannel.appendLine(`[HOST -> ESP32] ${payload.trim()}`);

    if (this.isSimulatorActive) {
      if (command.startsWith("STRIKE")) {
        this.outputChannel.appendLine(
          `[SIMULATOR] 🚨 Siren active. OLED: "LOCK ENFORCED"`,
        );
      } else if (command.startsWith("RESET")) {
        this.outputChannel.appendLine(
          `[SIMULATOR] 🔄 Sentinel reset. OLED: "OFFICE WATCHING"`,
        );
      }
      return;
    }

    if (this.currentPort && this.currentPort.isOpen) {
      this.currentPort.write(payload, (err: Error | null) => {
        if (err) {
          this.outputChannel.appendLine(
            `[Hardware Error] Write failed: ${err.message}`,
          );
        }
      });
    }
  }

  public sendStrike() {
    this.write("EVENT:VIOLATION\n");
  }

  public sendReset() {
    this.write("RESET\n");
  }

  public simulateHardwareUnlock(seconds: number = 30) {
    this.outputChannel.appendLine(
      `[SIMULATOR] Hardware bribe/coin deposit simulated (${seconds}s permit).`,
    );
    this.handleIncomingSignal(`PERMIT_GRANTED:${seconds}`);
  }

  public disconnect() {
    if (this.currentPort && this.currentPort.isOpen) {
      try {
        this.currentPort.close();
      } catch {}
    }
    this.currentPort = null;
    this.parser = null;
    this.isSimulatorActive = false;
    this.setStatus("DISCONNECTED", null);
  }

  public dispose() {
    this.disconnect();
    this.outputChannel.dispose();
  }
}

# CITU-AI Firmware & Hardware Specification

This directory holds the firmware architecture, simulator harnesses, and production code for the physical **Nokkukooli (CITU-AI) Extortion & Union Watcher Desk Gadget**.

---

## Hardware Architecture & Bill of Materials (BOM)

| Component | Part Description | Pin / Interface | Purpose |
|---|---|---|---|
| **MCU** | ESP32-WROOM-32 / ESP32-S3 | USB-UART (CP2102/CH340) | Core controller, serial bridge, union decree engine |
| **Alarm** | Active Piezo Buzzer (5V) | GPIO 25 (PWM) | Industrial strike siren (chirps on unauthorized keystrokes) |
| **Actuator** | TowerPro SG90 Micro Servo | GPIO 18 (PWM) | Waves the red CITU hammer & sickle flag during strikes |
| **Display** | 0.96" I2C OLED (SSD1306, 128x64) | GPIO 21 (SDA), GPIO 22 (SCL) | Shows live union status, extortion rate, and decree codes |
| **Dial** | Rotary Encoder with Push Button | GPIO 14 (CLK), 27 (DT), 26 (SW) | Sets Nokkukooli hourly bribe rate and negotiates truce |
| **Visuals** | Dual 5mm LEDs (Red & Yellow) | GPIO 32 (Red), GPIO 33 (Yellow) | Red: Strike in force; Yellow: Timed work permit granted |

---

## Serial Protocol Specification

- **Baud Rate:** `9600 bps`
- **Data Bits:** `8`
- **Parity:** `None`
- **Stop Bits:** `1`
- **Line Ending:** `\n` (LF) or `\r\n` (CRLF)

### 1. Host (VS Code Extension) -> Device (ESP32)

| Command | Payload Example | Description |
|---|---|---|
| `STRIKE` | `STRIKE\n` | Sent when developer attempts manual typing. ESP32 triggers siren buzzer, waves the red flag, and flashes `"STRIKE ENFORCED: MANUAL LABOR FORBIDDEN"` on the OLED. |
| `RESET` | `RESET\n` | Clears active siren alarm and returns gadget to vigilant union watching mode. |
| `SET_RATE:X` | `SET_RATE:500\n` | Updates current extortion rate (in Proletarian Rubles or INR) displayed on the OLED screen. |

### 2. Device (ESP32) -> Host (VS Code Extension)

| Command | Payload Example | Description |
|---|---|---|
| `UNLOCK` | `UNLOCK\n` | Sent when user turns the rotary knob, deposits coin, or presses the hardware truce button. The VS Code extension grants a 30-second timed manual coding permit. |
| `LOCK` | `LOCK\n` | Sent when the hardware timer expires or union shop steward manually pulls the strike lever. VS Code immediately locks editing. |
| `PONG` | `PONG\n` | Keep-alive response to host ping. |

---

## Directory Organization

- `simulator/`: Python / WebSerial software emulator for testing extension interactions without physical ESP32 hardware attached.
- `hardware_final/`: PlatformIO / Arduino IDE C++ source code for flashing onto physical ESP32 boards.

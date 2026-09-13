<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# NOKKUKOOLI 

<img width="857" height="488" alt="image" src="https://github.com/user-attachments/assets/d83026b7-1d0a-44f9-a72e-cf4786e0c7a2" />




## Basic Details
### Team Name: Union leader

### Team Members
- Team Lead: Alen Elias Cherian - Cochin University College of Engineering Kuttanad
- Member 2: Amith Biju - Cochin University College of Engineering Kuttanad

### Project Description
**NOKKUKOOLI** is a satirical hardware-and-software apparatus inspired by the notorious Kerala concept of **“നോക്കുകൂലി”** (*looking-on charges* or *gawking wages*), transplanted into the 2026 AI developer era.

**NOKKUKOOLI ** turns this idea into a ridiculous desktop coding-agent experience: **you pay the agent for watching you work, not for doing the work.**

Instead of a union worker standing by and demanding payment, NOKKUKOOLI uses a **desktop robotic sentinel representing your coding agent**. The sentinel demands **കൂലി (kooli)** simply for allowing you to work.

**Drop a coin →** the sentinel becomes happy and lets you continue coding.
**Don't pay →** it becomes angry, raises its arms, and demands its kooli.
**Try to bargain →** you can negotiate with the sentinel to reduce the demanded amount.

The result is an intentionally ridiculous combination of **AI, hardware, and Kerala's Nokkukooli satire**—a coding agent that gets paid for simply watching you work while doing none of the heavy lifting.


### The Problem (that doesn't exist)
Modern coding agents are designed to do the work for developers, but nobody has built one that demands payment for simply watching them work.

**Inspired by Kerala's satirical concept of നോക്കുകൂലി (Nokkukooli),** the challenge is to create a playful desktop system where a coding-agent sentinel demands kooli before allowing the developer to continue working. If the payment is skipped, the sentinel becomes angry and demands its due—while giving the developer the opportunity to bargain and negotiate the kooli.

**The problem:** How can we turn the absurd idea of paying an agent simply for watching you code into an interactive hardware-and-software experience?

### The Solution (that nobody asked for)
A desktop toy that acts as the coding agent's Nokkukooli representative. It collects the agent's കൂലി (kooli) through a coin drop and reacts to whether you pay.

Pay the kooli → the sentinel becomes happy and lets you work.
Don't pay → it becomes angry, raises its arms, and demands payment.
Try to bargain → negotiate with the sentinel to reduce the kooli and get back to work.

It's an unnecessarily physical way of turning നോക്കുകൂലി into a hilarious interaction between you and your coding agent.

## Technical Details
### Technologies/Components Used
For Software:
- Languages used: C++, Arduino, Python/JavaScript (Host side serial listener)
- Frameworks used: Arduino IDE / ESP32 Core 3.x
- Libraries used: Adafruit GFX, Adafruit SSD1306, SPI
- Tools used: Git, VS Code, PlatformIO / Arduino CLI

For Hardware:
- Microcontroller: Freenove ESP32-S3 Board
- Display: 128x64 SPI OLED Display (SSD1306 driver)
- Sensors: HC-SR04 Ultrasonic Distance Sensor
- Actuators: 2x Micro Servo Motors (Articulated Arms)
- Indicators: Piezo mist generator module (Pin 47)

### Implementation
For Software:
# Installation

1. Clone the repository and open the project folder.
2. Flash the firmware from the `firmware/` folder onto the ESP32-S3 using **ESP-IDF**.
3. Install the **Kammi-AI VS Code extension** from the `extension/` folder and install its dependencies:

   ```bash
   cd extension
   npm install
   npm run compile
   ```
4. Configure the required API keys by copying `.env.example` to `.env.local` and adding your **Gemini** and **ElevenLabs** keys.
5. Connect the ESP32-S3 to your computer via USB and identify the **COM/serial port** assigned to the device.

# Run

1. Start the ESP32-S3 with the firmware flashed from the `firmware/` folder.
2. Open the project in VS Code and press **`F5`** to launch the **Extension Development Host**.
3. Select the **serial/COM port connected to the NOKKUKOOLI sentinel** from the extension.
4. Open any code or text file and start working.
5. The  extension communicates with the physical sentinel through the selected serial port.
6. Pay the **കൂലി (kooli)** using the coin-drop mechanism to keep the sentinel happy. If you skip the payment or trigger a violation, the sentinel enters **Angry Mode** with flashing LEDs and raised arms.
7. You can even **bargain with the agent** to reduce the demanded kooli.


## Project Documentation
                      
For Hardware:
# Diagram
### Architecture

```mermaid
flowchart TB

    subgraph Client["VS Code Extension Host - TypeScript"]
        direction TB

        subgraph EditorIntercept["Keystroke Interception and Policy Engine"]
            direction TB
            TYPE["Type Command Override"]
            PASTE["Paste Command Override"]
            STATE["Permit State Machine"]
        end

        subgraph UILayer["User Interfaces"]
            direction TB
            MODAL["Constructivist Strike Modal<br/>Webview Audio and Bribe Ledger"]
            SIDEBAR["Soviet Sidebar<br/>Port Selector and Agent Dispatch"]
        end

        subgraph CoreServices["Background Services"]
            direction TB
            AGENT["AgentService<br/>vscode.lm / Copilot"]
            CONCIL["ConciliatorService<br/>Gemini API"]
            TTS["TtsService<br/>ElevenLabs API"]
            SERIAL["SerialManager<br/>115200 Baud UART"]
        end
    end

    subgraph CloudAI["Cloud AI Infrastructure"]
        direction TB
        GEMINI["Google Gemini API<br/>Comrade Conciliator"]
        ELEVEN["ElevenLabs API<br/>Malayalam Strike Voice"]
        COPILOT["GitHub Copilot LLM<br/>Proletarian Code Generation"]
    end

    subgraph HardwareSentinel["Physical ESP32-S3 Desk Sentinel"]
        direction TB
        MCU["ESP32-S3 Microcontroller"]
        HCSR04["HC-SR04 Ultrasonic Sensor<br/>Coin Detection"]
        LED["Status / Violation LED<br/>GPIO 47"]
        SERVO1["Micro Servo 1 - Left Arm<br/>GPIO 21"]
        SERVO2["Micro Servo 2 - Right Arm<br/>GPIO 45"]
        OLED["SPI OLED Display<br/>SSD1306"]
    end

    USER(["Developer"]) -->|Typing / Paste| TYPE
    USER -->|Typing / Paste| PASTE

    TYPE -->|Check Locked State| STATE
    PASTE -->|Check Locked State| STATE

    STATE -->|Locked - Block Input| MODAL
    STATE -->|Violation| SERIAL

    USER -->|Voice Plea| MODAL
    MODAL -->|Audio / Text Plea| CONCIL
    CONCIL -->|Negotiate Kooli| GEMINI

    CONCIL -->|Malayalam Speech Request| TTS
    TTS -->|Synthesize Speech| ELEVEN
    TTS -->|Return Audio| MODAL

    USER -->|Commission Agent| SIDEBAR
    SIDEBAR -->|Coding Prompt| AGENT
    AGENT -->|Generate Code| COPILOT

    SERIAL <-->|USB Serial - 115200 Baud| MCU

    HCSR04 -->|Coin Detected| MCU
    MCU -->|EVENT:COIN| SERIAL
    SERIAL -->|Update Kooli Balance| STATE

    MCU -->|LED Control| LED
    MCU -->|PWM Control| SERVO1
    MCU -->|PWM Control| SERVO2
    MCU -->|Display Expression| OLED
```

# Schematic & Circuit Connections
<img width="682" height="491" alt="image" src="https://github.com/user-attachments/assets/93d925b4-676f-441d-9eca-6379655607df" />

<img width="1060" height="500" alt="image" src="https://github.com/user-attachments/assets/b00cd4e3-0c36-4232-bf0b-afe1332a12ad" />
         Schematic Diagram: Physical pinout layout of the Freenove ESP32-S3 microcontroller and its interconnected peripherals.
         
### screenshots
#### vs code extension 
<img width="1533" height="817" alt="image" src="https://github.com/user-attachments/assets/4f4dc750-c2b9-4ff5-97d9-5f0ae741ed3c" />

<img width="718" height="302" alt="image" src="https://github.com/user-attachments/assets/e2f96f5b-e310-411c-adea-d78f424e93f4" />

#### TOY IMG

<img width="730" height="548" alt="image" src="https://github.com/user-attachments/assets/02fc06e5-7041-490b-8736-6ef89736b375" />
<img width="695" height="517" alt="image" src="https://github.com/user-attachments/assets/e8145926-db9f-4387-9ca7-881738c49726" />
<img width="698" height="521" alt="image" src="https://github.com/user-attachments/assets/64add2ec-8267-4208-89a7-18539c5d91b8" />
<img width="693" height="525" alt="image" src="https://github.com/user-attachments/assets/8cdcc844-1259-4575-9291-8171a450e21d" />




# Build Photos

 DEMO TEST 1
 
 ![NOKKUKOOLI Build Journey](ezgif.com-video-to-gif-converter_1.gif)

  DEMO  TEST 2
  
   ![NOKKUKOOLI Build Journey](working_demo_2-ezgif.com-video-to-gif-converter.gif)

<img width="396" height="520" alt="image" src="https://github.com/user-attachments/assets/7d162d0e-011b-4206-9d91-78dc20768a69" />

<img width="406" height="550" alt="image" src="https://github.com/user-attachments/assets/85adead1-e89b-4450-97e5-671e247557f4" />

#### Components pictuer

<img width="987" height="557" alt="image" src="https://github.com/user-attachments/assets/cdd2f27f-0961-4874-b94e-8df6e7972fb4" />

  -> list of components used
  
    Freenove ESP32-S3 Microcontroller Board (Quantity: 1)

    128x64 SPI OLED Display - SSD1306 driver (Quantity: 1)

    HC-SR04 Ultrasonic Distance Sensor (Quantity: 1)

    Micro Servo Motors (Quantity: 2)

    Piezo Mist Generator Module (Quantity: 1)
-> Final build
<img width="697" height="527" alt="image" src="https://github.com/user-attachments/assets/ef249741-7cad-4c13-9371-e4e354821965" />

Build Journey Video: https://drive.google.com/drive/folders/10kj9D-wRr1ZJJ6Q2odVD12QUhY3tBbYD?usp=sharing


### Project Demo
# Video
[*(Link to video demo *](https://drive.google.com/drive/folders/1n8Yt4mt-epqzKZ2gL3_OR2DlSLlJ87M2?usp=sharing)

# Additional Demos
**Want to know what nookukooli is all about and why we built this chaotic little machine?** Head over to the documentation on our site (nokkukooli-live.vercel.app) to dive into the legendary Kerala inspection culture, see how we brought the ultimate "gazing fee" to your desk, and find out why we willingly chose to build the most counter-productive coding sentinel ever made.

[nokkukooli-live.vercel.app](https://nokkukooli-live.vercel.app/)

## Team Contributions
- Amith Biju - Software architecture, state machine logic, non-blocking sensor implementation, and serial interface.
- Alen Elias Cherian - Hardware assembly, circuit schematics, physical chassis construction, and servo/sensor integration.

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)

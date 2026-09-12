<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# NOKKUKOOLI 

## Basic Details
### Team Name: Union leader

### Team Members
- Team Lead: Alen Elias Cherian - Cochin University College of Engineering Kuttanad
- Member 2: Amith Biju - Cochin University College of Engineering Kuttanad

### Project Description
NOKKUKOOLI turns the traditional concept of നോക്കുകൂലി into a humorous hardware and software sentinel agent. The agent demands കൂലി (kooli) simply for being present and watching you work—charging you for the sheer privilege of its observation rather than any actual labor.

Pay the kooli via coin drop → the sentinel accepts payment, turns happy, and lets you work.
Skip the kooli or trigger a violation → the sentinel goes into an angry inspection mode, raises its automated arms, cuts off power/status via LED indicators, and flags a violation.

The joke: the agent gets paid purely for watching you work while doing none of the heavy lifting.

### The Problem (that doesn't exist)
Software developers and terminal jockeys type away all day without paying proper tribute to local inspection culture. There is an absolute lack of physical surveillance demanding a mandatory gaze fee just for existing near a workstation.

### The Solution (that nobody asked for)
An interactive hardware sentinel powered by an ESP32-S3 that monitors your distance via ultrasonic sensor, coordinates expressions on an SPI OLED display, articulates dual servo-driven arms, and integrates with your computer via serial communication to lock down workflows until the coin tribute is paid.

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
1. Clone the repository and open the project folder in Arduino IDE or VS Code with PlatformIO.
2. Ensure the ESP32 board package version 3.x is installed.
3. Install required library dependencies (`Adafruit GFX` and `Adafruit SSD1306`).
4. Configure Arduino IDE settings: Set **USB CDC On Boot** to **Enabled**.

# Run
1. Connect your Freenove ESP32-S3 via the UART port.
2. Compile and upload the firmware sketch.
3. Open the Serial Monitor at **115200 baud** (Newline enabled) to view status logs and transmit test commands like `EVENT:VIOLATION`.

### Project Documentation
For Hardware:

# Schematic & Circuit Connections
* **SPI OLED Display:**
  * SCLK $\rightarrow$ GPIO 18
  * MOSI $\rightarrow$ GPIO 13
  * DC $\rightarrow$ GPIO 16
  * RESET $\rightarrow$ GPIO 17
  * CS $\rightarrow$ Tied LOW / -1
* **HC-SR04 Ultrasonic Sensor:**
  * Trig $\rightarrow$ GPIO 5
  * Echo $\rightarrow$ GPIO 15
* **Actuators (Servos):**
  * Left Arm Servo $\rightarrow$ GPIO 21
  * Right Arm Servo $\rightarrow$ GPIO 45
* **Indicators:**
  * Status piezo electric module $\rightarrow$ GPIO 47
### screenshots
<img width="1533" height="817" alt="image" src="https://github.com/user-attachments/assets/4f4dc750-c2b9-4ff5-97d9-5f0ae741ed3c" />

<img width="718" height="302" alt="image" src="https://github.com/user-attachments/assets/e2f96f5b-e310-411c-adea-d78f424e93f4" />

### Project Demo
# Video
[*(Link to video demo to be added)*](https://drive.google.com/drive/folders/1n8Yt4mt-epqzKZ2gL3_OR2DlSLlJ87M2?usp=sharing)

# Additional Demos
[nokkukooli-live.vercel.app](https://nokkukooli-live.vercel.app/)

## Team Contributions
- Amith Biju - Software architecture, state machine logic, non-blocking sensor implementation, and serial interface.
- Alen Elias Cherian - Hardware assembly, circuit schematics, physical chassis construction, and servo/sensor integration.

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)

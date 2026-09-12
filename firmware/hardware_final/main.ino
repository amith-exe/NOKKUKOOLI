/*
 * Nokkukooli (CITU-AI) - ESP32-S3 Hardware Sentinel Firmware
 * Target: ESP32-S3 (Arduino Core)
 *
 * Bidirectional Event Protocol:
 * - HC-SR04 Coin Detection (Trig: GPIO 5, Echo: GPIO 18) -> Transmits "EVENT:COIN\n"
 * - Keystroke Interception Alert <- Receives "EVENT:VIOLATION\n" -> 2-Second Non-Blocking Rapid LED Blink (GPIO 4)
 */

#include <Arduino.h>

// Pin Definitions
constexpr uint8_t PIN_TRIG = 5;
constexpr uint8_t PIN_ECHO = 18;
constexpr uint8_t PIN_LED  = 4; // Built-in or external indicator LED

// Ultrasonic Sensor Non-Blocking State Machine
enum class UltrasonicState {
    IDLE,
    TRIG_HIGH,
    WAIT_ECHO
};

UltrasonicState sensorState = UltrasonicState::IDLE;
unsigned long sensorStateTimer = 0;
unsigned long lastSensorTrigger = 0;
constexpr unsigned long SENSOR_INTERVAL_MS = 60; // Measure every 60ms

// Debounce & Coin Detection
unsigned long lastCoinTime = 0;
constexpr unsigned long COIN_DEBOUNCE_MS = 1500; // 1.5s debounce
constexpr float COIN_DISTANCE_THRESHOLD_CM = 2.0f; // <= 2cm detection

// LED Violation Alarm State Machine (Non-blocking millis timer)
bool isViolationActive = false;
unsigned long violationStartTime = 0;
unsigned long lastLedToggleTime = 0;
bool ledState = false;
constexpr unsigned long VIOLATION_DURATION_MS = 2000; // 2 seconds rapid flash
constexpr unsigned long LED_BLINK_INTERVAL_MS = 80;   // Rapid toggle every 80ms

void setup() {
    // 115200 Baud communication link with VS Code extension
    Serial.begin(115200);
    Serial.setTimeout(10);

    pinMode(PIN_TRIG, OUTPUT);
    pinMode(PIN_ECHO, INPUT);
    pinMode(PIN_LED, OUTPUT);

    digitalWrite(PIN_TRIG, LOW);
    digitalWrite(PIN_LED, LOW);

    // Initial ready handshake
    Serial.println("INIT:ESP32_READY");
}

/**
 * Reads HC-SR04 distance without blocking loop execution.
 * Triggers pulse and measures echo pulse duration.
 */
void updateUltrasonicSensor() {
    unsigned long now = millis();

    switch (sensorState) {
        case UltrasonicState::IDLE:
            if (now - lastSensorTrigger >= SENSOR_INTERVAL_MS) {
                lastSensorTrigger = now;
                digitalWrite(PIN_TRIG, HIGH);
                sensorStateTimer = micros();
                sensorState = UltrasonicState::TRIG_HIGH;
            }
            break;

        case UltrasonicState::TRIG_HIGH:
            // 10us trigger pulse
            if (micros() - sensorStateTimer >= 10) {
                digitalWrite(PIN_TRIG, LOW);
                sensorState = UltrasonicState::WAIT_ECHO;
            }
            break;

        case UltrasonicState::WAIT_ECHO: {
            // Measure echo pulse with a safe 15ms timeout (~2.5m range max)
            unsigned long duration = pulseIn(PIN_ECHO, HIGH, 15000);
            if (duration > 0) {
                float distanceCm = (duration * 0.0343f) / 2.0f;

                // Check if coin passed within 2cm threshold and debounce window
                if (distanceCm > 0.1f && distanceCm <= COIN_DISTANCE_THRESHOLD_CM) {
                    if (now - lastCoinTime >= COIN_DEBOUNCE_MS) {
                        lastCoinTime = now;
                        Serial.print("EVENT:COIN\n");
                    }
                }
            }
            sensorState = UltrasonicState::IDLE;
            break;
        }
    }
}

/**
 * Handles incoming non-blocking serial commands from the VS Code extension.
 */
void updateSerialReceiver() {
    if (Serial.available() > 0) {
        String incoming = Serial.readStringUntil('\n');
        incoming.trim();

        if (incoming == "EVENT:VIOLATION" || incoming == "STRIKE") {
            // Trigger 2-second non-blocking rapid LED alarm
            isViolationActive = true;
            violationStartTime = millis();
            lastLedToggleTime = millis();
            ledState = true;
            digitalWrite(PIN_LED, HIGH);
        }
    }
}

/**
 * Updates the violation rapid LED flashing state machine using millis().
 */
void updateViolationLed() {
    if (!isViolationActive) {
        return;
    }

    unsigned long now = millis();

    // Check if 2-second violation window has concluded
    if (now - violationStartTime >= VIOLATION_DURATION_MS) {
        isViolationActive = false;
        ledState = false;
        digitalWrite(PIN_LED, LOW);
        return;
    }

    // Rapid toggle
    if (now - lastLedToggleTime >= LED_BLINK_INTERVAL_MS) {
        lastLedToggleTime = now;
        ledState = !ledState;
        digitalWrite(PIN_LED, ledState ? HIGH : LOW);
    }
}

void loop() {
    updateUltrasonicSensor();
    updateSerialReceiver();
    updateViolationLed();
}

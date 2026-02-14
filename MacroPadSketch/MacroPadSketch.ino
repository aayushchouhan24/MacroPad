// =============================================================================
// MacroPadSketch.ino — Main firmware  (DUMB I/O — no config storage)
// Hardware : ESP32-C3 · 2×5 matrix · rotary encoder · BLE
// Library  : NimBLE-Arduino >= 1.4  (install via Library Manager)
// Board    : ESP32C3 Dev Module  (Arduino-ESP32 core)
//
// The ESP stores NOTHING (no NVS, no EEPROM, no persistent RAM).
// All configuration (key mappings, profiles, encoder modes) lives on the PC.
// The ESP only sends raw hardware events: key press/release, encoder rotate,
// encoder button, and battery level.
// =============================================================================

#include <Arduino.h>
#include <driver/gpio.h>
#include <esp_sleep.h>
#include "Config.h"
#include "KeyMatrix.h"
#include "Encoder.h"
#include "Battery.h"
#include "BleService.h"
#include "SerialBridge.h"

// ── Global instances ────────────────────────────────────────────────────────
KeyMatrix      keyMatrix;
RotaryEncoder  encoder;
BatteryMonitor battery;
BleService     bleService;
SerialBridge   serialBridge;

// Runtime-only settings (never saved, reset to defaults on reboot)
uint16_t      debounceMs         = DEFAULT_DEBOUNCE_MS;
uint8_t       encoderSensitivity = DEFAULT_ENCODER_SENSITIVITY;
uint32_t      sleepTimeoutMs     = DEFAULT_SLEEP_TIMEOUT_MS;

unsigned long lastActivity = 0;
bool          sleeping     = false;

// ── Helpers ─────────────────────────────────────────────────────────────────
void resetActivity() {
    lastActivity = millis();
    sleeping     = false;
}

// ── Callbacks: key / encoder / battery ──────────────────────────────────────
void onKey(uint8_t idx, bool pressed) {
    resetActivity();
    uint8_t evt = pressed ? EVT_KEY_PRESS : EVT_KEY_RELEASE;
    bleService.sendKeyEvent(evt, idx);
    serialBridge.sendKeyEvent(evt, idx);
    Serial.printf("Key %u %s\n", idx, pressed ? "DOWN" : "UP");
}

void onRotate(int8_t dir, uint8_t steps) {
    resetActivity();
    uint8_t d = dir > 0 ? DIR_CW : DIR_CCW;
    bleService.sendEncoderEvent(EVT_ENCODER_ROTATE, d, steps);
    serialBridge.sendEncoderEvent(EVT_ENCODER_ROTATE, d, steps);
    Serial.printf("Enc %s x%u\n", dir > 0 ? "CW" : "CCW", steps);
}

void onEncButton(bool pressed) {
    resetActivity();
    uint8_t evt = pressed ? EVT_ENCODER_BTN_PRESS : EVT_ENCODER_BTN_RELEASE;
    uint8_t d   = pressed ? 1 : 0;
    bleService.sendEncoderEvent(evt, d, 0);
    serialBridge.sendEncoderEvent(evt, d, 0);
    Serial.printf("Enc btn %s\n", pressed ? "DOWN" : "UP");
}

void onBattery(uint8_t pct, uint16_t mv) {
    bleService.updateBatteryLevel(pct);
    serialBridge.updateBatteryLevel(pct);
    Serial.printf("Batt %u%% (%u mV)\n", pct, mv);
}

// ── Command handler (only volatile/transient commands) ──────────────────────
void onCommand(uint8_t cmd, const uint8_t* d, size_t n) {
    Serial.printf("CMD 0x%02X len=%u\n", cmd, n);

    switch (cmd) {

    case CMD_IDENTIFY:
        // Send device info so the app knows what board this is
        bleService.updateDeviceInfo();
        serialBridge.sendDeviceInfo();
        break;

    case CMD_SET_DEBOUNCE_LIVE:
        // Temporary debounce change - lost on reboot
        if (n >= 2) {
            debounceMs = (d[0] << 8) | d[1];
            keyMatrix.setDebounceMs(debounceMs);
            Serial.printf("Debounce (live) = %u ms\n", debounceMs);
        }
        break;

    default:
        Serial.printf("Unknown CMD 0x%02X - ignored\n", cmd);
        break;
    }
}

void onConfigWrite(uint8_t type, const uint8_t*, size_t) {
    // No config storage - ignore config writes from app
    Serial.printf("CFG write type 0x%02X - ignored (no storage)\n", type);
}

// ── Sleep ───────────────────────────────────────────────────────────────────
void configureSleepWakeup() {
    for (int r = 0; r < NUM_ROWS; r++) {
        digitalWrite(ROW_PINS[r], LOW);
    }
    for (int c = 0; c < NUM_COLS; c++) {
        gpio_wakeup_enable((gpio_num_t)COL_PINS[c], GPIO_INTR_LOW_LEVEL);
    }
    gpio_wakeup_enable((gpio_num_t)ENC_A_PIN,   GPIO_INTR_LOW_LEVEL);
    gpio_wakeup_enable((gpio_num_t)ENC_B_PIN,   GPIO_INTR_LOW_LEVEL);
    gpio_wakeup_enable((gpio_num_t)ENC_BTN_PIN, GPIO_INTR_LOW_LEVEL);
    esp_sleep_enable_gpio_wakeup();
}

void restoreAfterWake() {
    for (int r = 0; r < NUM_ROWS; r++) {
        digitalWrite(ROW_PINS[r], HIGH);
    }
    for (int c = 0; c < NUM_COLS; c++) {
        gpio_wakeup_disable((gpio_num_t)COL_PINS[c]);
    }
    gpio_wakeup_disable((gpio_num_t)ENC_A_PIN);
    gpio_wakeup_disable((gpio_num_t)ENC_B_PIN);
    gpio_wakeup_disable((gpio_num_t)ENC_BTN_PIN);

    encoder.begin();
    encoder.setSensitivity(encoderSensitivity);
    bleService.startAdvertising();
}

void checkSleep() {
    if (sleepTimeoutMs == 0 || sleeping) return;
    if (serialBridge.isHandshaked()) { resetActivity(); return; }
    if ((millis() - lastActivity) >= sleepTimeoutMs) {
        Serial.println("Entering light sleep...");
        Serial.flush();
        sleeping = true;

        bleService.stopAdvertising();
        configureSleepWakeup();
        esp_light_sleep_start();

        // ── Woke up ────────────────────────────────────────────────────
        Serial.println("Woke up!");
        restoreAfterWake();

        serialBridge.begin(Serial);
        serialBridge.setCommandCallback(onCommand);
        serialBridge.setConfigCallback(onConfigWrite);

        delay(50);
        keyMatrix.scan();
        encoder.update();

        Serial.println("BLE advertising restarted, ready");
        resetActivity();
    }
}

// =============================================================================
// setup() / loop()
// =============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n====== MacroPad (dumb I/O mode) ======");
    Serial.printf("FW: %u.%u.%u  Layout: %ux%u\n",
        FW_VERSION_MAJOR, FW_VERSION_MINOR, FW_VERSION_PATCH,
        NUM_ROWS, NUM_COLS);
    Serial.println("No config stored on device - PC handles everything.");

    keyMatrix.begin();
    keyMatrix.setDebounceMs(debounceMs);
    keyMatrix.setCallback(onKey);

    encoder.begin();
    encoder.setSensitivity(encoderSensitivity);
    encoder.setRotateCallback(onRotate);
    encoder.setButtonCallback(onEncButton);

    battery.begin();
    battery.setCallback(onBattery);

    bleService.begin(DEFAULT_DEVICE_NAME);
    bleService.setCommandCallback(onCommand);
    bleService.setConfigCallback(onConfigWrite);
    bleService.updateBatteryLevel(battery.getPercentage());

    serialBridge.begin(Serial);
    serialBridge.setCommandCallback(onCommand);
    serialBridge.setConfigCallback(onConfigWrite);

    lastActivity = millis();
    Serial.println("====== Ready ======");
}

void loop() {
    keyMatrix.scan();
    encoder.update();
    battery.update();
    serialBridge.update();
    checkSleep();
    delay(1);
}
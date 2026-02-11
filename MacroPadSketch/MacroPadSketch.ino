// =============================================================================
// MacroPadSketch.ino — Main firmware
// Hardware : ESP32-C3 · 2×5 matrix · rotary encoder · BLE
// Library  : NimBLE-Arduino ≥ 1.4  (install via Library Manager)
// Board    : ESP32C3 Dev Module  (Arduino-ESP32 core)
// =============================================================================

#include <Arduino.h>
#include "Config.h"
#include "KeyMatrix.h"
#include "Encoder.h"
#include "Battery.h"
#include "ConfigStore.h"
#include "BleService.h"

// ─── Global instances ────────────────────────────────────────────────────────
KeyMatrix      keyMatrix;
RotaryEncoder  encoder;
BatteryMonitor battery;
ConfigStore    configStore;
BleService     bleService;
DeviceConfig   cfg;

unsigned long lastActivity = 0;
bool          sleeping     = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────
void resetActivity() {
    lastActivity = millis();
    sleeping     = false;
}

// Forward declarations
void sendCurrentConfig();
void handleProfileSync(const uint8_t* data, size_t len);

// ─── Callbacks: key / encoder / battery ──────────────────────────────────────
void onKey(uint8_t idx, bool pressed) {
    resetActivity();
    bleService.sendKeyEvent(pressed ? EVT_KEY_PRESS : EVT_KEY_RELEASE, idx);
    Serial.printf("Key %u %s\n", idx, pressed ? "DOWN" : "UP");
}

void onRotate(int8_t dir, uint8_t steps) {
    resetActivity();
    bleService.sendEncoderEvent(EVT_ENCODER_ROTATE,
                                dir > 0 ? DIR_CW : DIR_CCW, steps);
    Serial.printf("Enc %s ×%u\n", dir > 0 ? "CW" : "CCW", steps);
}

void onEncButton(bool pressed) {
    resetActivity();
    bleService.sendEncoderEvent(
        pressed ? EVT_ENCODER_BTN_PRESS : EVT_ENCODER_BTN_RELEASE,
        pressed ? 1 : 0, 0);
    Serial.printf("Enc btn %s\n", pressed ? "DOWN" : "UP");
}

void onBattery(uint8_t pct, uint16_t mv) {
    bleService.updateBatteryLevel(pct);
    Serial.printf("Batt %u%% (%u mV)\n", pct, mv);
}

// ─── BLE command handler ─────────────────────────────────────────────────────
void onCommand(uint8_t cmd, const uint8_t* d, size_t n) {
    Serial.printf("CMD 0x%02X len=%u\n", cmd, n);

    switch (cmd) {

    case CMD_FACTORY_RESET:
        configStore.factoryReset();          // reboots
        break;

    case CMD_SET_BT_NAME:
        if (n > 0 && n < sizeof(cfg.deviceName)) {
            memcpy(cfg.deviceName, d, n);
            cfg.deviceName[n] = '\0';
            configStore.saveDeviceName(cfg.deviceName);
        }
        break;

    case CMD_SET_DEBOUNCE:
        if (n >= 2) {
            cfg.debounceMs = (d[0] << 8) | d[1];
            keyMatrix.setDebounceMs(cfg.debounceMs);
            configStore.saveDebounceMs(cfg.debounceMs);
        }
        break;

    case CMD_SET_ENC_SENSITIVITY:
        if (n >= 1) {
            cfg.encoderSensitivity          = d[0];
            cfg.encoderConfig.sensitivity   = d[0];
            encoder.setSensitivity(d[0]);
            configStore.saveEncoderConfig(cfg.encoderConfig);
        }
        break;

    case CMD_SET_SLEEP_TIMEOUT:
        if (n >= 4) {
            cfg.sleepTimeoutMs = ((uint32_t)d[0] << 24) | ((uint32_t)d[1] << 16)
                               | ((uint32_t)d[2] << 8)  | d[3];
            configStore.saveSleepTimeout(cfg.sleepTimeoutMs);
        }
        break;

    case CMD_SAVE_CONFIG:
        configStore.saveConfig(cfg);
        Serial.println("Config saved");
        break;

    case CMD_REQUEST_CONFIG:
        sendCurrentConfig();
        break;

    case CMD_SET_KEY_MAP:
        if (n >= 5) {
            uint8_t ki = d[0];
            if (ki < NUM_KEYS) {
                cfg.keyMappings[ki].type      = d[1];
                cfg.keyMappings[ki].keyCode   = d[2];
                cfg.keyMappings[ki].modifiers = d[3];
                uint8_t ml = d[4];
                cfg.keyMappings[ki].macroLength = ml;
                if (ml > 0 && ml <= MAX_MACRO_LENGTH && n >= 5u + ml)
                    memcpy(cfg.keyMappings[ki].macro, d + 5, ml);
                configStore.saveKeyMapping(ki, cfg.keyMappings[ki]);
            }
        }
        break;

    case CMD_SET_ENCODER_MODE:
        if (n >= 8) {
            cfg.encoderConfig.mode         = d[0];
            cfg.encoderConfig.cwKeyCode    = d[1];
            cfg.encoderConfig.ccwKeyCode   = d[2];
            cfg.encoderConfig.cwModifiers  = d[3];
            cfg.encoderConfig.ccwModifiers = d[4];
            cfg.encoderConfig.sensitivity  = d[5];
            cfg.encoderConfig.btnKeyCode   = d[6];
            cfg.encoderConfig.btnModifiers = d[7];
            if (n >= 9) cfg.encoderConfig.btnMapType = d[8];
            encoder.setSensitivity(cfg.encoderConfig.sensitivity);
            configStore.saveEncoderConfig(cfg.encoderConfig);
        }
        break;

    case CMD_SYNC_PROFILE:
        handleProfileSync(d, n);
        break;
    }
}

void onConfigWrite(uint8_t type, const uint8_t*, size_t) {
    Serial.printf("CFG write type 0x%02X (handled via CMD)\n", type);
}

// ─── Send full config to app ─────────────────────────────────────────────────
void sendCurrentConfig() {
    // Device settings packet
    uint8_t buf[80];
    uint8_t p = 0;
    buf[p++] = CFG_DEVICE_SETTINGS;
    buf[p++] = cfg.debounceMs >> 8;
    buf[p++] = cfg.debounceMs & 0xFF;
    buf[p++] = cfg.encoderSensitivity;
    buf[p++] = (cfg.sleepTimeoutMs >> 24) & 0xFF;
    buf[p++] = (cfg.sleepTimeoutMs >> 16) & 0xFF;
    buf[p++] = (cfg.sleepTimeoutMs >>  8) & 0xFF;
    buf[p++] =  cfg.sleepTimeoutMs        & 0xFF;
    uint8_t nl = strlen(cfg.deviceName);
    buf[p++] = nl;
    memcpy(buf + p, cfg.deviceName, nl);  p += nl;
    bleService.sendConfigData(buf, p);
    delay(20);

    // Per-key mappings
    for (int i = 0; i < NUM_KEYS; i++) {
        uint8_t kb[48]; uint8_t kp = 0;
        kb[kp++] = CFG_KEY_MAPPING;
        kb[kp++] = i;
        kb[kp++] = cfg.keyMappings[i].type;
        kb[kp++] = cfg.keyMappings[i].keyCode;
        kb[kp++] = cfg.keyMappings[i].modifiers;
        kb[kp++] = cfg.keyMappings[i].macroLength;
        if (cfg.keyMappings[i].macroLength > 0) {
            memcpy(kb + kp, cfg.keyMappings[i].macro,
                   cfg.keyMappings[i].macroLength);
            kp += cfg.keyMappings[i].macroLength;
        }
        bleService.sendConfigData(kb, kp);
        delay(20);
    }

    // Encoder config
    uint8_t eb[12]; uint8_t ep = 0;
    eb[ep++] = CFG_ENCODER_CONFIG;
    eb[ep++] = cfg.encoderConfig.mode;
    eb[ep++] = cfg.encoderConfig.cwKeyCode;
    eb[ep++] = cfg.encoderConfig.ccwKeyCode;
    eb[ep++] = cfg.encoderConfig.cwModifiers;
    eb[ep++] = cfg.encoderConfig.ccwModifiers;
    eb[ep++] = cfg.encoderConfig.sensitivity;
    eb[ep++] = cfg.encoderConfig.btnKeyCode;
    eb[ep++] = cfg.encoderConfig.btnModifiers;
    eb[ep++] = cfg.encoderConfig.btnMapType;
    bleService.sendConfigData(eb, ep);
}

// ─── Profile sync ────────────────────────────────────────────────────────────
void handleProfileSync(const uint8_t* d, size_t n) {
    if (n < 1) return;
    size_t pos = 0;
    uint8_t nameLen = d[pos++];          // skip profile name
    pos += nameLen;

    for (int i = 0; i < NUM_KEYS && pos + 4 <= n; i++) {
        cfg.keyMappings[i].type      = d[pos++];
        cfg.keyMappings[i].keyCode   = d[pos++];
        cfg.keyMappings[i].modifiers = d[pos++];
        uint8_t ml = d[pos++];
        cfg.keyMappings[i].macroLength = ml;
        if (ml > 0 && pos + ml <= n) {
            memcpy(cfg.keyMappings[i].macro, d + pos,
                   min((int)ml, MAX_MACRO_LENGTH));
            pos += ml;
        }
    }

    if (pos + 9 <= n) {
        cfg.encoderConfig.mode         = d[pos++];
        cfg.encoderConfig.cwKeyCode    = d[pos++];
        cfg.encoderConfig.ccwKeyCode   = d[pos++];
        cfg.encoderConfig.cwModifiers  = d[pos++];
        cfg.encoderConfig.ccwModifiers = d[pos++];
        cfg.encoderConfig.sensitivity  = d[pos++];
        cfg.encoderConfig.btnKeyCode   = d[pos++];
        cfg.encoderConfig.btnModifiers = d[pos++];
        cfg.encoderConfig.btnMapType   = d[pos++];
        encoder.setSensitivity(cfg.encoderConfig.sensitivity);
    }

    configStore.saveConfig(cfg);
    Serial.println("Profile synced & saved");
}

// ─── Sleep ───────────────────────────────────────────────────────────────────
void checkSleep() {
    if (cfg.sleepTimeoutMs == 0 || sleeping) return;
    if ((millis() - lastActivity) >= cfg.sleepTimeoutMs) {
        Serial.println("Entering light sleep…");
        sleeping = true;
        esp_sleep_enable_gpio_wakeup();
        esp_light_sleep_start();            // blocks until wake
        resetActivity();
        Serial.println("Woke up");
    }
}

// =============================================================================
// setup() / loop()
// =============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n══════ MacroPad ══════");

    configStore.begin();
    configStore.loadConfig(cfg);
    Serial.printf("Name: %s  FW: %u.%u.%u\n",
        cfg.deviceName, FW_VERSION_MAJOR, FW_VERSION_MINOR, FW_VERSION_PATCH);

    keyMatrix.begin();
    keyMatrix.setDebounceMs(cfg.debounceMs);
    keyMatrix.setCallback(onKey);

    encoder.begin();
    encoder.setSensitivity(cfg.encoderConfig.sensitivity);
    encoder.setRotateCallback(onRotate);
    encoder.setButtonCallback(onEncButton);

    battery.begin();
    battery.setCallback(onBattery);

    bleService.begin(cfg.deviceName);
    bleService.setCommandCallback(onCommand);
    bleService.setConfigCallback(onConfigWrite);
    bleService.updateBatteryLevel(battery.getPercentage());

    lastActivity = millis();
    Serial.println("══════ Ready ══════");
}

void loop() {
    keyMatrix.scan();
    encoder.update();
    battery.update();
    checkSleep();
    delay(1);
}

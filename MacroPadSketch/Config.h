// =============================================================================
// Config.h — MacroPad Firmware Configuration
// Hardware: ESP32-C3 · 2×5 Key Matrix · Rotary Encoder · BLE
// =============================================================================
#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ─── Pin Configuration ───────────────────────────────────────────────────────
#define NUM_ROWS 2
#define NUM_COLS 5
#define NUM_KEYS (NUM_ROWS * NUM_COLS)

static const uint8_t ROW_PINS[NUM_ROWS] = {21, 20};
static const uint8_t COL_PINS[NUM_COLS] = {0, 1, 2, 3, 4};

#define ENC_A_PIN   5
#define ENC_B_PIN   6
#define ENC_BTN_PIN 7       // Encoder push-button — adjust to your wiring

// ─── Battery Monitoring (optional) ───────────────────────────────────────────
// Set BATTERY_ENABLED to true and wire a voltage divider to an ADC-capable pin.
// On ESP32-C3 only GPIO 0-4 have ADC1 channels; pick one not used by the matrix
// or time-multiplex with caution.
#define BATTERY_ENABLED           false
#define BATTERY_ADC_PIN           3
#define BATTERY_FULL_MV           4200
#define BATTERY_EMPTY_MV          3000
#define BATTERY_DIVIDER           2.0f
#define BATTERY_READ_INTERVAL_MS  30000

// ─── Default Settings ────────────────────────────────────────────────────────
#define DEFAULT_DEVICE_NAME         "MacroPad"
#define DEFAULT_DEBOUNCE_MS         20
#define DEFAULT_ENCODER_SENSITIVITY 2
#define DEFAULT_SLEEP_TIMEOUT_MS    300000   // 5 min

// ─── BLE UUIDs ───────────────────────────────────────────────────────────────
#define SERVICE_UUID              "e5e60001-b594-4841-8a6c-5b0d12e7e4a8"
#define KEY_EVENT_CHAR_UUID       "e5e60002-b594-4841-8a6c-5b0d12e7e4a8"
#define ENCODER_EVENT_CHAR_UUID   "e5e60003-b594-4841-8a6c-5b0d12e7e4a8"
#define DEVICE_INFO_CHAR_UUID     "e5e60004-b594-4841-8a6c-5b0d12e7e4a8"
#define BATTERY_CHAR_UUID         "e5e60005-b594-4841-8a6c-5b0d12e7e4a8"
#define CONFIG_CHAR_UUID          "e5e60006-b594-4841-8a6c-5b0d12e7e4a8"
#define COMMAND_CHAR_UUID         "e5e60007-b594-4841-8a6c-5b0d12e7e4a8"

// Standard Battery Service (OS-level battery indicator)
#define BATTERY_SVC_UUID          "180f"
#define BATTERY_LVL_CHAR_UUID     "2a19"

// ─── Protocol — Event Types ──────────────────────────────────────────────────
#define EVT_KEY_PRESS             0x01
#define EVT_KEY_RELEASE           0x02
#define EVT_ENCODER_ROTATE        0x10
#define EVT_ENCODER_BTN_PRESS     0x11
#define EVT_ENCODER_BTN_RELEASE   0x12

// Direction
#define DIR_CW                    0x01
#define DIR_CCW                   0xFF

// ─── Protocol — Commands (app → device) ──────────────────────────────────────
#define CMD_FACTORY_RESET         0x01
#define CMD_SET_BT_NAME           0x02
#define CMD_SET_DEBOUNCE          0x03
#define CMD_SET_ENC_SENSITIVITY   0x04
#define CMD_SET_SLEEP_TIMEOUT     0x05
#define CMD_SAVE_CONFIG           0x06
#define CMD_REQUEST_CONFIG        0x07
#define CMD_SET_KEY_MAP           0x08
#define CMD_SET_ENCODER_MODE      0x09
#define CMD_SYNC_PROFILE          0x0A

// ─── Protocol — Config Packet Types (device → app) ──────────────────────────
#define CFG_KEY_MAPPING           0x01
#define CFG_ENCODER_CONFIG        0x02
#define CFG_DEVICE_SETTINGS       0x03

// ─── Key Mapping Types ───────────────────────────────────────────────────────
#define MAP_NONE                  0x00
#define MAP_SINGLE_KEY            0x01
#define MAP_MEDIA_KEY             0x02
#define MAP_MODIFIER_COMBO        0x03
#define MAP_TEXT_MACRO            0x04
#define MAP_SHORTCUT              0x05

// ─── Encoder Modes ────────────────────────────────────────────────────────────
#define ENC_MODE_VOLUME           0x01
#define ENC_MODE_SCROLL           0x02
#define ENC_MODE_ZOOM             0x03
#define ENC_MODE_BRIGHTNESS       0x04
#define ENC_MODE_CUSTOM           0x05

// ─── Firmware Version ─────────────────────────────────────────────────────────
#define FW_VERSION_MAJOR          1
#define FW_VERSION_MINOR          0
#define FW_VERSION_PATCH          0

// ─── Modifier Bit-Flags (HID standard) ──────────────────────────────────────
#define MOD_NONE                  0x00
#define MOD_LEFT_CTRL             0x01
#define MOD_LEFT_SHIFT            0x02
#define MOD_LEFT_ALT              0x04
#define MOD_LEFT_GUI              0x08
#define MOD_RIGHT_CTRL            0x10
#define MOD_RIGHT_SHIFT           0x20
#define MOD_RIGHT_ALT             0x40
#define MOD_RIGHT_GUI             0x80

// ─── Data Structures ─────────────────────────────────────────────────────────
#define MAX_MACRO_LENGTH 32

struct KeyMapping {
    uint8_t type;                     // MAP_*
    uint8_t keyCode;                  // HID key code
    uint8_t modifiers;                // MOD_* flags
    uint8_t macroLength;
    char    macro[MAX_MACRO_LENGTH];
};

struct EncoderConfig {
    uint8_t mode;           // ENC_MODE_*
    uint8_t cwKeyCode;
    uint8_t ccwKeyCode;
    uint8_t cwModifiers;
    uint8_t ccwModifiers;
    uint8_t sensitivity;    // 1-10
    uint8_t btnKeyCode;
    uint8_t btnModifiers;
    uint8_t btnMapType;     // MAP_*
};

struct DeviceConfig {
    char          deviceName[32];
    uint16_t      debounceMs;
    uint8_t       encoderSensitivity;
    uint32_t      sleepTimeoutMs;
    KeyMapping    keyMappings[NUM_KEYS];
    EncoderConfig encoderConfig;
};

#endif // CONFIG_H

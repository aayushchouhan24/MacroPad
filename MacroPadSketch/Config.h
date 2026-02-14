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
// The ESP stores NOTHING.  It is a dumb I/O board.
// All configuration lives on the PC.  Only two commands remain:
#define CMD_IDENTIFY              0x07   // device replies with device-info
#define CMD_SET_DEBOUNCE_LIVE     0x03   // RAM-only, lost on reboot

// ─── Firmware Version ─────────────────────────────────────────────────────────
#define FW_VERSION_MAJOR          1
#define FW_VERSION_MINOR          0
#define FW_VERSION_PATCH          0

// ─── No data structures on ESP ───────────────────────────────────────────────
// All key mappings, profiles, encoder config live on the PC.
// The ESP only sends raw hardware events (key press/release, encoder rotate).

#endif // CONFIG_H

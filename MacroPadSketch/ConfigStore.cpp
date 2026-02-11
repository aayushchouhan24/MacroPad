// =============================================================================
// ConfigStore.cpp — Persistent configuration in NVS (flash)
// =============================================================================
#include "ConfigStore.h"

void ConfigStore::begin() { _p.begin("macropad", false); }

bool ConfigStore::isFirstBoot() { return !_p.isKey("init"); }

// ── Defaults ─────────────────────────────────────────────────────────────────
void ConfigStore::setDefaults(DeviceConfig& cfg) {
    strlcpy(cfg.deviceName, DEFAULT_DEVICE_NAME, sizeof(cfg.deviceName));
    cfg.debounceMs         = DEFAULT_DEBOUNCE_MS;
    cfg.encoderSensitivity = DEFAULT_ENCODER_SENSITIVITY;
    cfg.sleepTimeoutMs     = DEFAULT_SLEEP_TIMEOUT_MS;

    for (int i = 0; i < NUM_KEYS; i++) {
        memset(&cfg.keyMappings[i], 0, sizeof(KeyMapping));
        cfg.keyMappings[i].type = MAP_NONE;
    }

    cfg.encoderConfig = {};
    cfg.encoderConfig.mode        = ENC_MODE_VOLUME;
    cfg.encoderConfig.sensitivity = DEFAULT_ENCODER_SENSITIVITY;
}

// ── Load ─────────────────────────────────────────────────────────────────────
void ConfigStore::loadConfig(DeviceConfig& cfg) {
    if (isFirstBoot()) {
        setDefaults(cfg);
        saveConfig(cfg);
        _p.putBool("init", true);
        return;
    }

    _p.getString("name", cfg.deviceName, sizeof(cfg.deviceName));
    cfg.debounceMs         = _p.getUShort("dbnc",  DEFAULT_DEBOUNCE_MS);
    cfg.encoderSensitivity = _p.getUChar("esens",   DEFAULT_ENCODER_SENSITIVITY);
    cfg.sleepTimeoutMs     = _p.getULong("sleep",   DEFAULT_SLEEP_TIMEOUT_MS);

    for (int i = 0; i < NUM_KEYS; i++) {
        char key[8];
        snprintf(key, sizeof(key), "km%d", i);
        if (_p.getBytes(key, &cfg.keyMappings[i], sizeof(KeyMapping)) != sizeof(KeyMapping)) {
            memset(&cfg.keyMappings[i], 0, sizeof(KeyMapping));
        }
    }

    if (_p.getBytes("enc", &cfg.encoderConfig, sizeof(EncoderConfig)) != sizeof(EncoderConfig)) {
        cfg.encoderConfig = {};
        cfg.encoderConfig.mode        = ENC_MODE_VOLUME;
        cfg.encoderConfig.sensitivity = DEFAULT_ENCODER_SENSITIVITY;
    }
}

// ── Save ─────────────────────────────────────────────────────────────────────
void ConfigStore::saveConfig(const DeviceConfig& cfg) {
    _p.putString("name",  cfg.deviceName);
    _p.putUShort("dbnc",  cfg.debounceMs);
    _p.putUChar("esens",  cfg.encoderSensitivity);
    _p.putULong("sleep",  cfg.sleepTimeoutMs);

    for (int i = 0; i < NUM_KEYS; i++) {
        char key[8];
        snprintf(key, sizeof(key), "km%d", i);
        _p.putBytes(key, &cfg.keyMappings[i], sizeof(KeyMapping));
    }
    _p.putBytes("enc", &cfg.encoderConfig, sizeof(EncoderConfig));
}

void ConfigStore::saveKeyMapping(uint8_t idx, const KeyMapping& m) {
    if (idx >= NUM_KEYS) return;
    char key[8];
    snprintf(key, sizeof(key), "km%d", idx);
    _p.putBytes(key, &m, sizeof(KeyMapping));
}

void ConfigStore::saveEncoderConfig(const EncoderConfig& enc) {
    _p.putBytes("enc", &enc, sizeof(EncoderConfig));
}

void ConfigStore::saveDeviceName(const char* n) { _p.putString("name", n); }
void ConfigStore::saveDebounceMs(uint16_t ms)   { _p.putUShort("dbnc", ms); }
void ConfigStore::saveSleepTimeout(uint32_t ms)  { _p.putULong("sleep", ms); }

void ConfigStore::factoryReset() {
    _p.clear();
    ESP.restart();
}

// =============================================================================
// ConfigStore.h — Persistent configuration in NVS (flash)
// =============================================================================
#ifndef CONFIG_STORE_H
#define CONFIG_STORE_H

#include "Config.h"
#include <Preferences.h>

class ConfigStore {
public:
    void begin();
    void loadConfig(DeviceConfig& cfg);
    void saveConfig(const DeviceConfig& cfg);
    void saveKeyMapping(uint8_t idx, const KeyMapping& m);
    void saveEncoderConfig(const EncoderConfig& enc);
    void saveDeviceName(const char* name);
    void saveDebounceMs(uint16_t ms);
    void saveSleepTimeout(uint32_t ms);
    void factoryReset();
    bool isFirstBoot();

private:
    Preferences _p;
    void setDefaults(DeviceConfig& cfg);
};

#endif

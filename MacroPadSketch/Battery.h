// =============================================================================
// Battery.h — Optional battery-voltage monitor via ADC
// =============================================================================
#ifndef BATTERY_H
#define BATTERY_H

#include "Config.h"
#include <functional>

class BatteryMonitor {
public:
    using Callback = std::function<void(uint8_t pct, uint16_t mv)>;

    void     begin();
    void     update();
    void     setCallback(Callback cb);
    uint8_t  getPercentage() const;
    uint16_t getVoltageMv()  const;

private:
    uint8_t       _pct       = 100;
    uint16_t      _mv        = BATTERY_FULL_MV;
    unsigned long _lastRead  = 0;
    Callback      _cb        = nullptr;
};

#endif

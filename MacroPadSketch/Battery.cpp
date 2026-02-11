// =============================================================================
// Battery.cpp — Optional battery-voltage monitor via ADC
// =============================================================================
#include "Battery.h"

void BatteryMonitor::begin() {
#if BATTERY_ENABLED
    analogReadResolution(12);
    // 0-3.3 V range on ESP32-C3 with 11 dB attenuation
    analogSetAttenuation(ADC_11db);
    update();
#endif
}

void BatteryMonitor::update() {
#if BATTERY_ENABLED
    unsigned long now = millis();
    if (_lastRead != 0 && (now - _lastRead) < BATTERY_READ_INTERVAL_MS) return;
    _lastRead = now;

    // Average 16 samples
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) sum += analogRead(BATTERY_ADC_PIN);
    uint16_t raw = sum / 16;

    _mv = (uint16_t)((raw / 4095.0f) * 3300.0f * BATTERY_DIVIDER);

    if      (_mv >= BATTERY_FULL_MV)  _pct = 100;
    else if (_mv <= BATTERY_EMPTY_MV) _pct = 0;
    else _pct = (uint8_t)(((float)(_mv - BATTERY_EMPTY_MV) /
                            (float)(BATTERY_FULL_MV - BATTERY_EMPTY_MV)) * 100.0f);

    if (_cb) _cb(_pct, _mv);
#else
    _pct = 100;
    _mv  = BATTERY_FULL_MV;
#endif
}

void     BatteryMonitor::setCallback(Callback cb) { _cb = cb; }
uint8_t  BatteryMonitor::getPercentage() const     { return _pct; }
uint16_t BatteryMonitor::getVoltageMv()  const     { return _mv; }

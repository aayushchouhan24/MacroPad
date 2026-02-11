// =============================================================================
// KeyMatrix.h — 2×5 matrix scanning with debounce
// =============================================================================
#ifndef KEY_MATRIX_H
#define KEY_MATRIX_H

#include "Config.h"
#include <functional>

class KeyMatrix
{
public:
    using KeyCallback = std::function<void(uint8_t keyIndex, bool pressed)>;

    void begin();
    void scan();
    void setDebounceMs(uint16_t ms);
    void setCallback(KeyCallback cb);
    bool isKeyPressed(uint8_t index) const;
    uint16_t getPressedMask() const;

private:
    bool _stable[NUM_KEYS] = {};
    bool _raw[NUM_KEYS] = {};
    unsigned long _lastChange[NUM_KEYS] = {};
    uint16_t _debounceMs = DEFAULT_DEBOUNCE_MS;
    KeyCallback _cb = nullptr;
};

#endif

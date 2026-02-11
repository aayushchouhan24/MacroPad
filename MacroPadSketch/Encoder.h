// =============================================================================
// Encoder.h — Rotary encoder with quadrature decoding (interrupts) + button
// =============================================================================
#ifndef ENCODER_H
#define ENCODER_H

#include "Config.h"
#include <functional>

class RotaryEncoder {
public:
    using RotateCallback = std::function<void(int8_t direction, uint8_t steps)>;
    using ButtonCallback = std::function<void(bool pressed)>;

    void    begin();
    void    update();                       // call every loop()
    void    setSensitivity(uint8_t steps);
    void    setRotateCallback(RotateCallback cb);
    void    setButtonCallback(ButtonCallback cb);
    bool    isButtonPressed() const;
    int32_t getPosition() const;

private:
    static void IRAM_ATTR isrA();
    static void IRAM_ATTR isrB();
    static volatile int32_t _isrPos;
    static volatile uint8_t _lastState;

    int32_t       _reportedPos  = 0;
    uint8_t       _sensitivity  = DEFAULT_ENCODER_SENSITIVITY;
    bool          _btnStable    = false;
    bool          _btnRaw       = false;
    unsigned long _btnLastChg   = 0;
    RotateCallback _rotateCb    = nullptr;
    ButtonCallback _buttonCb    = nullptr;
};

#endif

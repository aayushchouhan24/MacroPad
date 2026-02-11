// =============================================================================
// Encoder.cpp — Rotary encoder with quadrature decoding (interrupts) + button
// =============================================================================
#include "Encoder.h"

volatile int32_t RotaryEncoder::_isrPos   = 0;
volatile uint8_t RotaryEncoder::_lastState = 0;

// Gray-code transition table: maps (prev_state<<2 | curr_state) → direction
static const int8_t ENC_TABLE[16] = {
     0, -1,  1,  0,
     1,  0,  0, -1,
    -1,  0,  0,  1,
     0,  1, -1,  0
};

void IRAM_ATTR RotaryEncoder::isrA() {
    uint8_t s   = (digitalRead(ENC_A_PIN) << 1) | digitalRead(ENC_B_PIN);
    uint8_t idx = (_lastState << 2) | s;
    _isrPos    += ENC_TABLE[idx & 0x0F];
    _lastState  = s;
}

void IRAM_ATTR RotaryEncoder::isrB() {
    uint8_t s   = (digitalRead(ENC_A_PIN) << 1) | digitalRead(ENC_B_PIN);
    uint8_t idx = (_lastState << 2) | s;
    _isrPos    += ENC_TABLE[idx & 0x0F];
    _lastState  = s;
}

void RotaryEncoder::begin() {
    pinMode(ENC_A_PIN,   INPUT_PULLUP);
    pinMode(ENC_B_PIN,   INPUT_PULLUP);
    pinMode(ENC_BTN_PIN, INPUT_PULLUP);

    _lastState = (digitalRead(ENC_A_PIN) << 1) | digitalRead(ENC_B_PIN);

    attachInterrupt(digitalPinToInterrupt(ENC_A_PIN), isrA, CHANGE);
    attachInterrupt(digitalPinToInterrupt(ENC_B_PIN), isrB, CHANGE);
}

void RotaryEncoder::update() {
    // ── Rotation ──
    int32_t pos  = _isrPos;
    int32_t diff = pos - _reportedPos;

    if (abs(diff) >= _sensitivity) {
        int8_t  dir   = (diff > 0) ? 1 : -1;
        uint8_t steps = abs(diff) / _sensitivity;
        _reportedPos += dir * steps * _sensitivity;
        if (_rotateCb) _rotateCb(dir, steps);
    }

    // ── Button (debounced) ──
    unsigned long now = millis();
    bool raw = (digitalRead(ENC_BTN_PIN) == LOW);

    if (raw != _btnRaw) { _btnRaw = raw; _btnLastChg = now; }

    if (_btnRaw != _btnStable && (now - _btnLastChg) >= DEFAULT_DEBOUNCE_MS) {
        _btnStable = _btnRaw;
        if (_buttonCb) _buttonCb(_btnStable);
    }
}

void RotaryEncoder::setSensitivity(uint8_t s) { _sensitivity = max((uint8_t)1, s); }
void RotaryEncoder::setRotateCallback(RotateCallback cb) { _rotateCb = cb; }
void RotaryEncoder::setButtonCallback(ButtonCallback cb) { _buttonCb = cb; }
bool RotaryEncoder::isButtonPressed() const { return _btnStable; }
int32_t RotaryEncoder::getPosition()  const { return _isrPos; }

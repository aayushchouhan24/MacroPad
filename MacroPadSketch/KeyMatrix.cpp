// =============================================================================
// KeyMatrix.cpp — 2×5 matrix scanning with debounce
// =============================================================================
#include "KeyMatrix.h"

void KeyMatrix::begin() {
    for (int r = 0; r < NUM_ROWS; r++) {
        pinMode(ROW_PINS[r], OUTPUT);
        digitalWrite(ROW_PINS[r], HIGH);
    }
    for (int c = 0; c < NUM_COLS; c++) {
        pinMode(COL_PINS[c], INPUT_PULLUP);
    }
}

void KeyMatrix::scan() {
    unsigned long now = millis();

    for (int r = 0; r < NUM_ROWS; r++) {
        digitalWrite(ROW_PINS[r], LOW);
        delayMicroseconds(10);   // settling time

        for (int c = 0; c < NUM_COLS; c++) {
            uint8_t idx     = r * NUM_COLS + c;
            bool    pressed = (digitalRead(COL_PINS[c]) == LOW);

            if (pressed != _raw[idx]) {
                _raw[idx]        = pressed;
                _lastChange[idx] = now;
            }

            if (_raw[idx] != _stable[idx] &&
                (now - _lastChange[idx]) >= _debounceMs)
            {
                _stable[idx] = _raw[idx];
                if (_cb) _cb(idx, _stable[idx]);
            }
        }
        digitalWrite(ROW_PINS[r], HIGH);
    }
}

void KeyMatrix::setDebounceMs(uint16_t ms) { _debounceMs = ms; }
void KeyMatrix::setCallback(KeyCallback cb) { _cb = cb; }

bool KeyMatrix::isKeyPressed(uint8_t i) const {
    return (i < NUM_KEYS) ? _stable[i] : false;
}

uint16_t KeyMatrix::getPressedMask() const {
    uint16_t mask = 0;
    for (int i = 0; i < NUM_KEYS; i++)
        if (_stable[i]) mask |= (1 << i);
    return mask;
}

// =============================================================================
// SerialBridge.cpp — Framed serial protocol implementation
// =============================================================================
#include "SerialBridge.h"

void SerialBridge::begin(Stream& serial) {
    _serial     = &serial;
    _handshaked = false;
    _state      = IDLE;
}

// ── Poll incoming bytes ──────────────────────────────────────────────────────
void SerialBridge::update() {
    if (!_serial) return;
    while (_serial->available()) {
        feedByte((uint8_t)_serial->read());
    }
}

// ── RX state machine — mirrors the TS parser exactly ─────────────────────────
void SerialBridge::feedByte(uint8_t b) {
    switch (_state) {
    case IDLE:
        if (b == PKT_START) {
            _state  = TYPE;
            _pktXor = 0;
        }
        break;

    case TYPE:
        _pktType = b;
        _pktXor ^= b;
        _state = LEN_HI;
        break;

    case LEN_HI:
        _pktLen = (uint16_t)b << 8;
        _pktXor ^= b;
        _state = LEN_LO;
        break;

    case LEN_LO:
        _pktLen |= b;
        _pktXor ^= b;
        if (_pktLen > SERIAL_RX_BUF_SIZE) {
            // Oversized — drop
            _state = IDLE;
        } else if (_pktLen > 0) {
            _pktPos = 0;
            _state  = DATA;
        } else {
            _state = CHECKSUM;
        }
        break;

    case DATA:
        _rxBuf[_pktPos++] = b;
        _pktXor ^= b;
        if (_pktPos >= _pktLen) {
            _state = CHECKSUM;
        }
        break;

    case CHECKSUM:
        if (b == _pktXor) {
            handlePacket(_pktType, _rxBuf, _pktLen);
        }
        _state = IDLE;
        break;
    }
}

// ── Handle a parsed incoming packet ──────────────────────────────────────────
void SerialBridge::handlePacket(uint8_t type, const uint8_t* data, uint16_t len) {
    switch (type) {

    case PKT_HANDSHAKE:
        // Verify magic "MPD"
        if (len >= 3 &&
            data[0] == HANDSHAKE_MAGIC_0 &&
            data[1] == HANDSHAKE_MAGIC_1 &&
            data[2] == HANDSHAKE_MAGIC_2) {

            _handshaked = true;

            // Reply with ACK
            uint8_t ack[] = { HANDSHAKE_MAGIC_0, HANDSHAKE_MAGIC_1, HANDSHAKE_MAGIC_2 };
            sendPacket(PKT_HANDSHAKE_ACK, ack, sizeof(ack));

            // Immediately send device info so the app can identify the board
            sendDeviceInfo();
        }
        break;

    case PKT_COMMAND:
        if (len >= 1 && _cmdCb) {
            _cmdCb(data[0], data + 1, len - 1);
        }
        break;

    case PKT_CONFIG_DATA:
        if (len >= 2 && _cfgCb) {
            _cfgCb(data[0], data + 1, len - 1);
        }
        break;
    }
}

// ── Send a framed packet ─────────────────────────────────────────────────────
void SerialBridge::sendPacket(uint8_t type, const uint8_t* data, uint16_t len) {
    if (!_serial) return;

    uint8_t header[4];
    header[0] = PKT_START;
    header[1] = type;
    header[2] = (len >> 8) & 0xFF;
    header[3] = len & 0xFF;
    _serial->write(header, 4);

    // Compute XOR over type + lenHi + lenLo + data
    uint8_t xorChk = type ^ header[2] ^ header[3];
    for (uint16_t i = 0; i < len; i++) {
        xorChk ^= data[i];
    }

    if (len > 0) {
        _serial->write(data, len);
    }
    _serial->write(xorChk);
}

// ── Outgoing helpers — same byte layouts as BleService ───────────────────────

void SerialBridge::sendKeyEvent(uint8_t evt, uint8_t idx) {
    if (!_handshaked) return;
    uint8_t pkt[2] = { evt, idx };
    sendPacket(PKT_KEY_EVENT, pkt, 2);
}

void SerialBridge::sendEncoderEvent(uint8_t evt, uint8_t dir, uint8_t steps) {
    if (!_handshaked) return;
    uint8_t pkt[3] = { evt, dir, steps };
    sendPacket(PKT_ENCODER_EVENT, pkt, 3);
}

void SerialBridge::updateBatteryLevel(uint8_t pct) {
    if (!_handshaked) return;
    sendPacket(PKT_BATTERY, &pct, 1);
}

void SerialBridge::sendConfigData(const uint8_t* data, size_t len) {
    if (!_handshaked) return;
    sendPacket(PKT_CONFIG_DATA, data, (uint16_t)len);
}

void SerialBridge::sendDeviceInfo() {
    uint8_t info[7] = {
        FW_VERSION_MAJOR, FW_VERSION_MINOR, FW_VERSION_PATCH,
        NUM_ROWS, NUM_COLS,
        1,  // hasEncoder
        BATTERY_ENABLED ? (uint8_t)1 : (uint8_t)0
    };
    sendPacket(PKT_DEVICE_INFO, info, 7);
}

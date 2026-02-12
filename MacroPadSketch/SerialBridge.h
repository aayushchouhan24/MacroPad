// =============================================================================
// SerialBridge.h — Framed serial protocol for USB connection (alternative to BLE)
// Packet format:  [0xAA] [TYPE] [LEN_HI] [LEN_LO] [DATA…] [XOR-checksum]
// All packet types & data layouts match the BLE GATT characteristics exactly.
// =============================================================================
#ifndef SERIAL_BRIDGE_H
#define SERIAL_BRIDGE_H

#include <Arduino.h>
#include "Config.h"

// ── Packet type IDs (shared with app serialApi.ts) ───────────────────────────
#define PKT_START           0xAA
#define PKT_KEY_EVENT       0x01
#define PKT_ENCODER_EVENT   0x02
#define PKT_CONFIG_DATA     0x03
#define PKT_BATTERY         0x04
#define PKT_DEVICE_INFO     0x05
#define PKT_COMMAND         0x06
#define PKT_HANDSHAKE       0x07
#define PKT_HANDSHAKE_ACK   0x08

#define HANDSHAKE_MAGIC_0   0x4D   // 'M'
#define HANDSHAKE_MAGIC_1   0x50   // 'P'
#define HANDSHAKE_MAGIC_2   0x44   // 'D'

#define SERIAL_RX_BUF_SIZE  256

// Callbacks — same signature as BLE callbacks
typedef void (*SerialCommandCb)(uint8_t cmd, const uint8_t* data, size_t len);
typedef void (*SerialConfigCb)(uint8_t type, const uint8_t* data, size_t len);

class SerialBridge {
public:
    void begin(Stream& serial);

    // Poll for incoming packets — call from loop()
    void update();

    // Outgoing data (mirrors BleService API)
    void sendKeyEvent(uint8_t evt, uint8_t idx);
    void sendEncoderEvent(uint8_t evt, uint8_t dir, uint8_t steps);
    void updateBatteryLevel(uint8_t pct);
    void sendConfigData(const uint8_t* data, size_t len);
    void sendDeviceInfo();

    // Register command & config callbacks
    void setCommandCallback(SerialCommandCb cb)  { _cmdCb = cb; }
    void setConfigCallback(SerialConfigCb cb)    { _cfgCb = cb; }

    bool isHandshaked() const { return _handshaked; }

private:
    Stream* _serial = nullptr;
    bool    _handshaked = false;

    SerialCommandCb _cmdCb = nullptr;
    SerialConfigCb  _cfgCb = nullptr;

    // RX parser state machine
    enum ParseState { IDLE, TYPE, LEN_HI, LEN_LO, DATA, CHECKSUM };
    ParseState _state = IDLE;
    uint8_t    _pktType = 0;
    uint16_t   _pktLen  = 0;
    uint16_t   _pktPos  = 0;
    uint8_t    _pktXor  = 0;
    uint8_t    _rxBuf[SERIAL_RX_BUF_SIZE];

    void feedByte(uint8_t b);
    void handlePacket(uint8_t type, const uint8_t* data, uint16_t len);
    void sendPacket(uint8_t type, const uint8_t* data, uint16_t len);
};

#endif // SERIAL_BRIDGE_H

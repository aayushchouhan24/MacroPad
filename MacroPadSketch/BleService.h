// =============================================================================
// BleService.h — BLE service exposing all MacroPad characteristics
// Requires: NimBLE-Arduino library ≥ 1.4  (install via Arduino Library Manager)
// =============================================================================
#ifndef BLE_SERVICE_H
#define BLE_SERVICE_H

#include "Config.h"
#include <NimBLEDevice.h>
#include <functional>

class BleService : public NimBLEServerCallbacks,
                   public NimBLECharacteristicCallbacks {
public:
    using CommandCb = std::function<void(uint8_t cmd, const uint8_t* data, size_t len)>;
    using ConfigCb  = std::function<void(uint8_t type, const uint8_t* data, size_t len)>;

    void begin(const char* deviceName);
    void setCommandCallback(CommandCb cb);
    void setConfigCallback(ConfigCb cb);

    void sendKeyEvent(uint8_t eventType, uint8_t keyIndex);
    void sendEncoderEvent(uint8_t eventType, uint8_t direction, uint8_t steps);
    void updateBatteryLevel(uint8_t pct);
    void sendConfigData(const uint8_t* data, size_t len);
    void updateDeviceInfo();

    bool isConnected() const;
    void startAdvertising();
    void stopAdvertising();

    // NimBLEServerCallbacks (v2.x signatures)
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override;
    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override;
    void onAuthenticationComplete(NimBLEConnInfo& connInfo) override;

    // NimBLECharacteristicCallbacks (v2.x signatures)
    void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override;
    void onRead(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override;

private:
    NimBLEServer*         _server   = nullptr;
    NimBLEService*        _svc      = nullptr;
    NimBLECharacteristic* _cKeyEvt  = nullptr;
    NimBLECharacteristic* _cEncEvt  = nullptr;
    NimBLECharacteristic* _cDevInfo = nullptr;
    NimBLECharacteristic* _cBatt    = nullptr;
    NimBLECharacteristic* _cConfig  = nullptr;
    NimBLECharacteristic* _cCmd     = nullptr;
    NimBLEService*        _battSvc  = nullptr;
    NimBLECharacteristic* _cBattLvl = nullptr;

    bool      _connected = false;
    CommandCb _cmdCb     = nullptr;
    ConfigCb  _cfgCb     = nullptr;
};

#endif

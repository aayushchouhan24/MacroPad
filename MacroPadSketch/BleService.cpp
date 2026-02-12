// =============================================================================
// BleService.cpp — Full NimBLE service implementation
// =============================================================================
#include "BleService.h"

void BleService::begin(const char* deviceName) {
    NimBLEDevice::init(deviceName);

    // Security: bonding + secure connections, "Just Works" (no MITM)
    NimBLEDevice::setSecurityAuth(true, false, true);
    NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    _server = NimBLEDevice::createServer();
    _server->setCallbacks(this);

    // ── MacroPad Service ─────────────────────────────────────────────────────
    _svc = _server->createService(SERVICE_UUID);

    _cKeyEvt = _svc->createCharacteristic(KEY_EVENT_CHAR_UUID,
                   NIMBLE_PROPERTY::NOTIFY);

    _cEncEvt = _svc->createCharacteristic(ENCODER_EVENT_CHAR_UUID,
                   NIMBLE_PROPERTY::NOTIFY);

    _cDevInfo = _svc->createCharacteristic(DEVICE_INFO_CHAR_UUID,
                   NIMBLE_PROPERTY::READ);

    _cBatt = _svc->createCharacteristic(BATTERY_CHAR_UUID,
                   NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

    _cConfig = _svc->createCharacteristic(CONFIG_CHAR_UUID,
                   NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY);
    _cConfig->setCallbacks(this);

    _cCmd = _svc->createCharacteristic(COMMAND_CHAR_UUID,
                   NIMBLE_PROPERTY::WRITE);
    _cCmd->setCallbacks(this);

    _svc->start();

    // ── Standard Battery Service (so the OS shows battery level) ─────────────
    _battSvc  = _server->createService(BATTERY_SVC_UUID);
    _cBattLvl = _battSvc->createCharacteristic(BATTERY_LVL_CHAR_UUID,
                    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    uint8_t full = 100;
    _cBattLvl->setValue(&full, 1);
    _battSvc->start();

    updateDeviceInfo();
    startAdvertising();
    Serial.println("BLE: service started, advertising…");
}

// ── Advertising ──────────────────────────────────────────────────────────────
void BleService::startAdvertising() {
    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->reset();                        // clear stale data from previous cycles
    adv->addServiceUUID(SERVICE_UUID);
    adv->enableScanResponse(true);
    adv->setPreferredParams(0x06, 0x12);
    adv->start();
    Serial.println("BLE: advertising started");
}
void BleService::stopAdvertising() { NimBLEDevice::getAdvertising()->stop(); }

// ── Callbacks ────────────────────────────────────────────────────────────────
void BleService::setCommandCallback(CommandCb cb) { _cmdCb = cb; }
void BleService::setConfigCallback(ConfigCb cb)   { _cfgCb = cb; }

// ── Connection ───────────────────────────────────────────────────────────────
void BleService::onConnect(NimBLEServer*, NimBLEConnInfo& connInfo) {
    _connected = true;
    Serial.println("BLE: client connected");
    stopAdvertising();
}
void BleService::onDisconnect(NimBLEServer*, NimBLEConnInfo& connInfo, int reason) {
    _connected = false;
    Serial.printf("BLE: client disconnected (reason=%d)\n", reason);
    startAdvertising();
}

void BleService::onAuthenticationComplete(NimBLEConnInfo& connInfo) {
    if (connInfo.isEncrypted())
        Serial.println("BLE: encrypted link established");
    else
        Serial.println("BLE: WARNING – link NOT encrypted");
}

// ── Characteristic writes (from app) ─────────────────────────────────────────
void BleService::onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) {
    std::string val = pChar->getValue();
    if (val.empty()) return;
    const uint8_t* d = (const uint8_t*)val.data();
    size_t         n = val.length();

    if (pChar == _cCmd && _cmdCb) {
        _cmdCb(d[0], d + 1, n - 1);
    } else if (pChar == _cConfig && n >= 2 && _cfgCb) {
        _cfgCb(d[0], d + 1, n - 1);
    }
}
void BleService::onRead(NimBLECharacteristic*, NimBLEConnInfo& connInfo) { /* values are set elsewhere */ }

// ── Outgoing data ────────────────────────────────────────────────────────────
void BleService::sendKeyEvent(uint8_t evt, uint8_t idx) {
    if (!_connected) return;
    uint8_t pkt[4] = {evt, idx, 0, 0};
    _cKeyEvt->setValue(pkt, 4);
    _cKeyEvt->notify();
}

void BleService::sendEncoderEvent(uint8_t evt, uint8_t dir, uint8_t steps) {
    if (!_connected) return;
    uint8_t pkt[4] = {evt, dir, steps, 0};
    _cEncEvt->setValue(pkt, 4);
    _cEncEvt->notify();
}

void BleService::updateBatteryLevel(uint8_t pct) {
    _cBatt->setValue(&pct, 1);
    _cBattLvl->setValue(&pct, 1);
    if (_connected) { _cBatt->notify(); _cBattLvl->notify(); }
}

void BleService::sendConfigData(const uint8_t* data, size_t len) {
    if (!_connected) return;
    _cConfig->setValue(data, len);
    _cConfig->notify();
}

void BleService::updateDeviceInfo() {
    uint8_t info[8] = {
        FW_VERSION_MAJOR, FW_VERSION_MINOR, FW_VERSION_PATCH,
        NUM_ROWS, NUM_COLS,
        1,  // hasEncoder
        BATTERY_ENABLED ? (uint8_t)1 : (uint8_t)0,
        0   // reserved
    };
    _cDevInfo->setValue(info, 8);
}

bool BleService::isConnected() const { return _connected; }

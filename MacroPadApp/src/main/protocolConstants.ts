// =============================================================================
// protocolConstants.ts — Shared protocol constants for the main process
// Mirrors the renderer's types.ts values so main doesn't import renderer code.
// =============================================================================

// Map types
export const MAP_NONE           = 0x00
export const MAP_SINGLE_KEY     = 0x01
export const MAP_MEDIA_KEY      = 0x02
export const MAP_MODIFIER_COMBO = 0x03
export const MAP_TEXT_MACRO     = 0x04
export const MAP_SHORTCUT       = 0x05
export const MAP_LAUNCH_APP     = 0x06

// Encoder modes
export const ENC_MODE_VOLUME     = 0x01
export const ENC_MODE_SCROLL     = 0x02
export const ENC_MODE_ZOOM       = 0x03
export const ENC_MODE_BRIGHTNESS = 0x04
export const ENC_MODE_CUSTOM     = 0x05

// Event types
export const EVT_KEY_PRESS          = 0x01
export const EVT_KEY_RELEASE        = 0x02
export const EVT_ENCODER_ROTATE     = 0x10
export const EVT_ENCODER_BTN_PRESS  = 0x11
export const EVT_ENCODER_BTN_RELEASE = 0x12

// Direction
export const DIR_CW  = 0x01
export const DIR_CCW = 0xff

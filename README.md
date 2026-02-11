# MacroPad - ESP32-C3 Bluetooth Macro Keyboard

A custom 10-key macro keyboard with rotary encoder featuring wireless Bluetooth connectivity and a modern desktop configuration app.

## 🌟 Features

- **10 Programmable Keys** (2×5 matrix layout)
- **Rotary Encoder** with push button functionality  
- **Wireless Bluetooth** connection via ESP32-C3
- **Modern Desktop App** with dark material UI
- **Multiple Key Types**: Single keys, key combos, media keys, text macros, app launching
- **System Integration**: Real-time key simulation, auto-connect, system tray
- **Profile Management**: Save/load/export different key configurations
- **Live Preview**: Real-time key press visualization

## 📦 Materials List

| Component | Quantity | Notes |
|-----------|----------|-------|
| **ESP32-C3 Mini** | 1 | Main microcontroller |
| **Rotary Encoder** | 1 | With push button (KY-040 or similar) |
| **Mechanical Key Switches** | 10 | Cherry MX compatible |
| **Keycaps** | 10 | 1U size |
| **Diodes** | 10 | 1N4148 for matrix (optional with 10 keys) |
| **Wire** | ~1m | 22-24 AWG for matrix connections |
| **PCB or Breadboard** | 1 | For prototyping |
| **3D Printed Case** | 1 | See 3D model below |

## 🖨️ 3D Printed Case

**Download the case**: [Macro Keyboard 9keys 1knob - MakerWorld](https://makerworld.com/en/models/739432-macro-keyboard-9keys-1knob?from=search#profileId-671721)

*Note: The linked model is for 9 keys, but can be adapted for this 10-key (2×5) layout*

## 🔌 Pin Configuration

### ESP32-C3 Mini Connections

| Function | Pin | Description |
|----------|-----|-------------|
| **Matrix Rows** | | |
| Row 1 | GPIO 21 | First row of key matrix |
| Row 2 | GPIO 20 | Second row of key matrix |
| **Matrix Columns** | | |
| Col 1 | GPIO 0 | Column 1 |
| Col 2 | GPIO 1 | Column 2 |
| Col 3 | GPIO 2 | Column 3 |
| Col 4 | GPIO 3 | Column 4 |
| Col 5 | GPIO 4 | Column 5 |
| **Rotary Encoder** | | |
| Encoder A | GPIO 5 | Quadrature signal A |
| Encoder B | GPIO 6 | Quadrature signal B |
| Encoder GND | GND | Ground |
| Encoder Button | R1×C5 | Connected to matrix position |

### Key Matrix Layout

```
     C1   C2   C3   C4   C5
R1   K1   K2   K3   K4   K5/ENC_BTN
R2   K6   K7   K8   K9   K10
```

**Note**: The encoder button is wired to Row 1, Column 5 position (same as Key 5)

## 🔧 Circuit Diagram

<p align="center">
  <img src="https://ik.imagekit.io/technoaayush/Circut%20Diagram__Ix5WEqqe.png" alt="shader-mouse banner" />
</p>

## 🚀 Getting Started

### Firmware Setup

1. **Clone this repository**:
   ```bash
   git clone https://github.com/yourusername/macropad.git
   cd macropad
   ```

2. **Open firmware** in Arduino IDE or PlatformIO:
   ```
   MacroPadSketch/MacroPadSketch.ino
   ```

3. **Install ESP32 board support** and required libraries:
   - ESP32 Arduino Core
   - NimBLE-Arduino

4. **Configure and upload** to your ESP32-C3

### Desktop App Setup

1. **Navigate to app directory**:
   ```bash
   cd MacroPadApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Development mode**:
   ```bash
   npm run dev
   ```

4. **Build installer**:
   ```bash
   npm run build
   npm run dist
   ```

## 💻 Desktop App Features

### Key Mapping Types
- **Single Key** - Basic key press (A, Enter, F1, etc.)
- **Key Combo** - Modifier combinations (Ctrl+C, Alt+Tab)
- **Media Key** - Volume, playback controls
- **Text Macro** - Type text strings
- **Launch App** - Open applications/run commands

### Encoder Functions
- **Volume Control** - System volume up/down
- **Scroll** - Mouse wheel simulation
- **Zoom** - Ctrl+scroll for zoom
- **Brightness** - Display brightness (where supported)
- **Custom Keys** - Any key combination

### System Integration
- **Auto-connect** - Reconnect to last used device
- **System Tray** - Run in background
- **Auto-startup** - Launch with Windows
- **Profile Sync** - Save settings to device flash

## 🔧 Troubleshooting

### Common Issues

**Device won't connect:**
- Ensure ESP32 is powered and advertising
- Check Bluetooth is enabled on computer
- Try forgetting and re-pairing the device

**Keys not working:**
- Verify pin connections match firmware configuration
- Check matrix wiring and diode orientation
- Ensure desktop app has appropriate permissions

**App doesn't minimize to tray:**
- Check that "Minimize to Tray" is enabled in Device Settings
- Restart the app with administrator privileges if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🌟 Author

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/aayushchouhan24">
        <img src="https://gravatar.com/userimage/226260988/f5429ad9b09c533449dab984eb05cdbf.jpeg?size=256" width="100px;" alt="Aayush Chouhan" style="border-radius: 50%;" />
        <br />
        <sub><b>Aayush Chouhan</b></sub>
      </a>
      <br />
      <a href="https://www.instagram.com/aayushchouhan_24/" title="Instagram"><img src="https://img.shields.io/badge/-Instagram-E4405F?style=flat-square&logo=instagram&logoColor=white" /></a>
      <a href="https://www.linkedin.com/in/aayushchouhan24/" title="LinkedIn"><img src="https://img.shields.io/badge/-LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white" /></a>
      <a href="https://github.com/aayushchouhan24" title="GitHub"><img src="https://img.shields.io/badge/-GitHub-181717?style=flat-square&logo=github&logoColor=white" /></a>
    </td>
  </tr>
</table>

## 🙏 Acknowledgments

- ESP32-Arduino community for excellent libraries
- Electron team for the desktop framework
- Mechanical keyboard community for inspiration
- MakerWorld community for 3D printing resources

## 📞 Support

- **Create an Issue** for bug reports or feature requests
- **Discussions** for general questions and community support
- **Wiki** for detailed documentation and assembly guides

---

**Happy macro-ing!** 🎹
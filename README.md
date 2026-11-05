# Jagannatha Hora (JHora) — Standalone Desktop App
### Cross-Platform macOS, Linux & Windows Edition

This is a standalone cross-platform desktop application for **Jagannatha Hora (JHora)**, the Vedic astrology software authored by P.V.R. Narasimha Rao.

It runs the authentic original Windows binary (`jhora.exe`) with complete Swiss Ephemeris data files via an embedded **v86 Dynamic Recompiler (JIT) WebAssembly engine** inside an Electron native shell.

---

## Features for Mac & Linux Users
- **Zero Configuration:** No Wine, Homebrew, Parallels, or command-line setup required.
- **Native File Dialogs:** Open `.jhd` chart files and export data directly to macOS Finder or Linux file managers.
- **Offline Capable:** All engine binaries and ephemeris tables are bundled directly inside the app.
- **Apple Silicon & Intel Support:** Runs on M1/M2/M3/M4 Apple Silicon and Intel Macs.
- **Linux Universal Support:** Distributed as a single portable `.AppImage` and Debian package (`.deb`).

---

## Project Structure
```
jhora-desktop/
├── src/
│   ├── main.js                  # Electron main process & local loopback server
│   ├── preload.js               # IPC bridge for native file dialogs
│   ├── index.html               # Desktop UI container & status bar
│   ├── libv86.js                # v86 WebAssembly JIT engine
│   ├── v86.wasm                 # x86 JIT WebAssembly core
│   ├── bios/                    # SeaBIOS & VGABIOS
│   ├── jhora.iso                # Full JHora binary + Swiss Ephemeris (Drive D:)
│   └── windows2k_state-v4.bin.zst # Fast-boot 28 MB desktop RAM snapshot
├── package.json                 # electron & electron-builder configuration
└── .github/workflows/build.yml  # Automated GitHub Actions multi-platform CI
```

---

## Local Development & Testing

1. **Install dependencies:**
   ```bash
   cd jhora-desktop
   npm install
   ```

2. **Run locally:**
   ```bash
   npm start
   ```

---

## Building Standalone Packages

### Build for macOS (`.dmg` & `.zip`):
```bash
npm run build:mac
```
*(Produces `dist-package/Jagannatha Hora-1.0.0-universal.dmg`)*

### Build for Linux (`.AppImage` & `.deb`):
```bash
npm run build:linux
```
*(Produces `dist-package/Jagannatha Hora-1.0.0.AppImage`)*

### Automated CI / GitHub Actions:
Pushing this directory to GitHub automatically triggers `.github/workflows/build.yml`, which compiles the native packages on macOS and Ubuntu runners for free and attaches the ready-to-download `.dmg` and `.AppImage` files as GitHub release artifacts.


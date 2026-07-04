# Ivory Wallpaper

English | [简体中文](README.zh-CN.md)

`Ivory Wallpaper` is a Windows dynamic wallpaper runtime project based on `Rust + Tao + Wry + Static Frontend`.

Its core goal is to run `web/index.html` directly as wallpaper content on Windows, providing a perfect multi-monitor, interactive widgets dashboard.

---

## ⚡ Quick Start

### 1. Prerequisites
Make sure your Windows system has the following installed:
* [Rust stable toolchain](https://www.rust-lang.org/)
* [Node.js (LTS)](https://nodejs.org/)

### 2. Build the Frontend
```powershell
cd frontend
npm install
npm run build
cd ..
```
This compiles the React frontend project and outputs the assets to the `web/` directory.

### 3. Build and Run the Rust Runtime
* **Build the Release binary**:
  ```powershell
  cargo build --release
  ```
* **Run in Desktop Wallpaper mode (`workerw`)**:
  ```powershell
  .\target\release\ivory_wallpaper_runtime.exe --mode workerw --html .\web\index.html
  ```

### 4. Background Execution and Stopping
* In `workerw` wallpaper mode, the application automatically **hides its console window** upon launch and runs silently in the background.
* To stop or restart the application, run the following in PowerShell:
  ```powershell
  Stop-Process -Name ivory_wallpaper_runtime -Force
  ```

### 5. Setting up Autostart on Boot
* Press `F8` on your desktop to activate the interactive edit layer (widgets are only clickable in edit mode).
* Click the **Settings** (gear) icon in the top-right corner.
* Switch to the **Startup** tab.
* Toggle the switch to enable launch at startup. The runtime will automatically register the executable path and HTML path to the Windows Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).

---

## Architecture

The project consists of two parts:

1. `Rust runtime`
   Responsible for creating windows, loading web views, hooking into `WorkerW`, enumerating multiple monitors, and displaying the overlay edit window on `F8`.

2. Frontend Static Pages
   Located in `web/index.html`, `web/css/`, and `web/js/`. Responsible for the wallpaper UI, data storage, calendar, memos, Todo lists, and wallpaper slideshows.

### Running Modes

* `lively`
  Standard application window mode, suitable for use with Lively Wallpaper (Application Wallpaper mode).

* `workerw`
  Attaches the window directly to the Windows desktop `WorkerW` layer.
  Also creates a hidden edit overlay window for each monitor, shown when pressing `F8`.

* `fullscreen`
  Fullscreen mode for debugging.

## Directory Structure

```text
ivory_wallpaper/
├─ Cargo.toml
├─ Cargo.lock
├─ README.md
├─ README.zh-CN.md
├─ web/
│  ├─ index.html
│  ├─ assets/
│  │  └─ index-*.js (Compiled frontend JS bundle from Vite)
│  ├─ css/
│  │  ├─ app.css
│  │  ├─ legacy.css
│  │  ├─ foundations/
│  │  ├─ components/
│  │  └─ features/
│  └─ js/
│     ├─ main.js
│     ├─ config.js
│     ├─ store.js
│     ├─ utils.js
│     ├─ native-bridge.js
│     ├─ startup-settings.js
│     ├─ weather-renderer.js
│     └─ script.js
└─ src/
   ├─ main.rs
   └─ startup.rs
```

### Key Files

* `src/main.rs`
  Rust runtime entry point. Handles argument parsing, window creation, `WorkerW` hook, multi-monitor window spawning, and the `F8` hotkey.

* `web/index.html`
  Wallpaper HTML page structure.

* `web/css/app.css`
  CSS entry point importing stylesheets from `foundations`, `components`, and `features`. `legacy.css` is retained as a compatibility fallback.

* `web/js/*.js`
  Frontend state management, persistence, daily memos, Todo deadlines, automatic rollover, and import/export logic.

## Implemented Features

### Wallpaper & Windowing

* Support for `workerw` desktop wallpaper mode.
* Support for independent wallpaper windows on multi-monitor setups.
* Automatic spawning of edit overlays for each display.
* `F8` hotkey to toggle edit mode.
* Read-only by default in wallpaper state; controls are interactive only in edit state.
* Fixed gaps at the screen boundaries and native wallpaper leakage issues.
* **Isolated Multi-Monitor Grid Scaling**: Supports independent scaling configs for large screens (e.g. 2560x1440) and small screens, fixing absolute proportions warping across dual screens.

### UI & Widgets

* Current time and date display at the top.
* Multiple built-in dynamic gradient backgrounds.
* **Wallpaper Slideshow**: Supports uploading multiple custom local images/GIFs, deleting them, and scheduling automated slideshow rotations (1, 3, 5, 10, 15, 30 minutes).
* Grid alignment and scaling adaptation for desktop icons.
* Markdown Memo widget supporting live editing and preview.
* Todo List:
  * Complete checkbox
  * Delete/Edit
  * Set deadline
  * Sort by deadline proximity
* Calendar View:
  * Save memo / todo per day
  * Highlights modified dates, today, and selected dates

### Data Persistence

* Fixed Configuration Directory
  WebView2 configurations, `localStorage`, and `IndexedDB` data are saved in a unified directory on Windows:

  ```text
  C:\ProgramData\IvoryWallpaper\WebView2
  ```

  This ensures that running via `cargo run`, release binaries, registry startup, or launching a manually specified HTML file all share the same frontend state. On the first launch, if this directory is empty, the runtime attempts to migrate existing WebView2 profiles from:

  - `%LOCALAPPDATA%\IvoryWallpaper\WebView2`
  - `target\release\ivory_wallpaper_runtime.exe.WebView2`
  - `target\debug\ivory_wallpaper_runtime.exe.WebView2`

  You can also supply a one-time JSON backup file for recovery:

  ```text
  C:\ProgramData\IvoryWallpaper\config.json
  ```

* `localStorage`
  Used for background selections, grid parameters, daily records, selected date keys, and layout snapshots.

* `IndexedDB`
  Used for storing custom background files to bypass the 5MB `localStorage` limit.

* Automatic Snapshot Backup:
  - Active background ID
  - Custom background file paths
  - Grid configuration parameters
  - Daily memo / todo lists
  - Selected date key

### Daily Rollover Logic

* Memos and Todos are tracked per-date.
* When the application is launched for the first time on a new day:
  * Copies the memo from the latest active recorded day.
  * Rolls over uncompleted Todos to today.
* Duplication prevention safeguards are active to prevent multiple screens from initiating rollover concurrently.

## Desktop Hook Mechanism (`workerw`)

In `workerw` mode, there are two types of windows running:

1. Wallpaper Windows
   Attached directly behind desktop icons, showing the background.

2. Edit Overlay Windows
   Normally hidden, displayed when pressing `F8`.
   Positioned directly above the desktop to capture click events for buttons, inputs, and modals.

This dual-layer design is key to providing both dynamic wallpapers and fully interactive widgets.

## Keyboard Shortcuts

* `F8`
  Toggles the edit overlay visibility in `workerw` mode.

* `Esc`
  Closes active modals inside the frontend web view.

## Import/Export Config

You can export and import JSON configurations using the buttons in the settings panel:

* Background settings
* Grid parameters
* Selected date key
* Daily memo/todo logs
* Custom uploaded background image blobs

## Development

### Requirements

* Windows OS
* Rust stable toolchain

The `workerw` wallpaper mounting is Windows-exclusive. On other operating systems, you can debug in `lively` mode.

### Common Commands

```powershell
cargo check
cargo build
cargo run -- --mode lively .\web\index.html
cargo run -- --mode workerw .\web\index.html
```

### Frontend Debugging Tips

* Use `lively` or `fullscreen` modes to design UI layouts and test components.
* Once the functionality is validated, test in `workerw` to confirm correct desktop mounting.
* Test differences between read-only wallpaper states and edit states:
  - `ivoryWindowRole=wallpaper`
  - `ivoryWindowRole=editor`

## Current Limitations

* Todo edits currently use the browser's native `prompt` dialog instead of inline edits.
* Deadlines use the native `datetime-local` input control, which has browser-restricted styling.
* `workerw` mode hooks into deep Windows API internals; compatibility may vary across OS versions.
* Large custom background images will increase the exported JSON backup size.

## Roadmap

* Inline editing for Todos.
* More visual urgency cues for deadlines.
* Enhanced import/export backward compatibility.
* Streamlined multi-monitor configuration profiles.

## License

No explicit license is provided in this repository. Adding a `LICENSE` file is recommended prior to public release.

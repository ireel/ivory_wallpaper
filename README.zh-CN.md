# Ivory Wallpaper

[English](README.md) | 简体中文

`Ivory Wallpaper` 是一个基于 `Rust + Tao + Wry + 静态前端` 的 Windows 动态壁纸运行时项目。

它当前的核心目标不是“生成给别人再打包的网页模板”，而是直接在 Windows 上把 `web/index.html` 作为壁纸内容运行起来，并在多屏环境下完美运行。

---

## ⚡ 快速开始 (Quick Start)

### 1. 前期准备
确保您的 Windows 系统上已安装：
* [Rust 编译环境 (stable)](https://www.rust-lang.org/)
* [Node.js (LTS)](https://nodejs.org/)

### 2. 编译前端
```powershell
cd frontend
npm install
npm run build
cd ..
```
这将把 React 前端项目编译打包并输出到 `web/` 目录下。

### 3. 编译与运行 Rust 运行时
* **构建 Release 版本**：
  ```powershell
  cargo build --release
  ```
* **直接作为桌面背景运行 (`workerw` 模式)**：
  ```powershell
  .\target\release\ivory_wallpaper_runtime.exe --mode workerw --html .\web\index.html
  ```

### 4. 后台运行与关闭
* 在 `workerw` 壁纸模式下，程序启动后会自动**隐藏控制台窗口**并在后台默默运行。
* 如果需要关闭或重启，您可以在 PowerShell 中运行：
  ```powershell
  Stop-Process -Name ivory_wallpaper_runtime -Force
  ```

### 5. 设置开机自启
* 在桌面上按 `F8` 键激活编辑层（编辑态下才能进行交互操作）。
* 点击右上角的 **设置**（Settings）图标。
* 切换到 **开机启动**（Startup）选项卡。
* 开启自启开关。运行时会自动在 Windows 注册表（`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`）中注册当前程序的执行路径和 HTML 路径。

---

## 当前架构

项目分成两部分：

1. `Rust runtime`
   负责创建窗口、加载网页、挂到 `WorkerW`、枚举多显示器，以及在 `F8` 时显示覆盖编辑窗口。

2. 前端静态页面
   由 `web/index.html`、`web/css/app.css`、`web/css/**/*.css`、`web/js/*.js` 组成，负责壁纸 UI、数据存储、日历、备忘录、Todo 逻辑与壁纸幻灯片轮播。

### 运行模式

* `lively`
  普通应用窗口模式，适合交给 Lively 的 Application Wallpaper 使用。

* `workerw`
  直接把窗口附着到 Windows 桌面 `WorkerW` 层。
  同时会为每块显示器再创建一个隐藏的编辑覆盖层窗口，按 `F8` 时显示。

* `fullscreen`
  调试用全屏模式。

## 目录说明

```text
ivory_wallpaper/
├─ Cargo.toml
├─ Cargo.lock
├─ README.md
├─ README.zh-CN.md
├─ web/
│  ├─ index.html
│  ├─ assets/
│  │  └─ index-*.js (Vite 编译打包后的 JS 资源)
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

### 关键文件

* `src/main.rs`
  Rust 运行时入口。处理参数解析、窗口创建、`WorkerW` 挂载、多屏独立窗口、`F8` 热键切换。

* `web/index.html`
  壁纸页面结构。

* `web/css/app.css`
  前端样式入口。按 `foundations`、`components`、`features` 分层导入，`legacy.css` 保留原有样式作为兼容基线。

* `web/js/*.js`
  前端状态管理、持久化、按日记录、Todo deadline、自动顺延、导入导出等逻辑。

## 已实现功能

### 壁纸与窗口

* 支持 `workerw` 壁纸模式。
* 支持多显示器独立壁纸窗口。
* 自动为每块屏幕创建对应的编辑覆盖层窗口。
* `F8` 切换编辑模式。
* 壁纸态默认只读，编辑态才显示交互控件。
* 处理了桌面边缘缝隙和原生壁纸漏边问题。
* **双显示器网格比例隔离**：支持大屏（2560x1440）和小屏网格独立缩放，解决双屏下绝对比例错乱的问题。

### UI 与内容

* 顶部时间和日期显示。
* 多套内置背景，支持上传自定义图片。
* **壁纸幻灯片轮播**：支持多张自定义本地壁纸上传及删除，并支持 1/3/5/10/15/30 分钟周期的定时轮换。
* 桌面图标网格校准与缩放适配。
* Markdown 备忘录，支持编辑与预览。
* Todo 列表：
  * 勾选完成
  * 删除
  * 编辑
  * 设置 deadline
  * 按 deadline 临近程度排序
* 日历查看：
  * 按天保存 memo / todo
  * 区分已修改日期、未修改日期、今天、当前选中日期

### 数据持久化

* 固定配置目录
  Windows 上统一使用固定目录保存 WebView2 配置、`localStorage` 和 `IndexedDB`：

  ```text
  C:\ProgramData\IvoryWallpaper\WebView2
  ```

  这样无论是 `cargo run`、`target\debug`、`target\release`、开机自启，还是手动指定 HTML 路径，都会使用同一份前端配置数据。首次启动时，如果固定目录为空，运行时会尝试从旧目录迁移现有 WebView2 数据：

  - `%LOCALAPPDATA%\IvoryWallpaper\WebView2`
  - `target\release\ivory_wallpaper_runtime.exe.WebView2`
  - `target\debug\ivory_wallpaper_runtime.exe.WebView2`

  可选的一次性恢复配置文件位置：

  ```text
  C:\ProgramData\IvoryWallpaper\config.json
  ```

* `localStorage`
  用于保存背景选择、网格参数、每日记录、选中日期、快照等。

* `IndexedDB`
  用于保存多张自定义背景图片，避免大图塞进 `localStorage`。

* 自动快照保存：
  - 背景
  - 自定义背景图片引用
  - 网格参数
  - 每日 memo / todo
  - 当前选中日期

### 每日记录逻辑

* 备忘录和 Todo 现在按日期保存。
* 若检测到“今天第一次启动”且今天还没有记录：
  * 会从最近一个早于今天的记录日复制 memo
  * 并把未完成 Todo 顺延到今天
* 为避免 `workerw` 多窗口并发重复顺延，已加防重逻辑。

## `workerw` 模式的实际行为

`workerw` 模式下不是只有一个窗口，而是两类窗口同时存在：

1. 壁纸窗口
   直接挂到桌面层，负责真正显示在桌面上的内容。

2. 编辑覆盖窗口
   默认隐藏，按 `F8` 才显示。
   这些窗口位于每块屏幕上方，用于让按钮、输入框、弹窗等可以正常交互。

这也是当前项目能同时满足“像真实壁纸一样挂在桌面上”和“还可以编辑内容”的关键。

## 快捷键

* `F8`
  在 `workerw` 模式下切换编辑覆盖层显示状态。

* `Esc`
  关闭前端页面中的弹窗。

## 配置导入导出

页面右上角支持保存 / 加载 JSON 配置。

导出的配置包含：

* 背景设置
* 网格参数
* 当前选中日期
* 每日 memo / todo 数据
* 自定义背景图片数据

## 开发说明

### 环境要求

* Windows
* Rust stable

当前 `workerw` 逻辑是 Windows 专用能力；非 Windows 下只能用普通窗口方式调试。

### 常用命令

```powershell
cargo check
cargo build
cargo run -- --mode lively .\web\index.html
cargo run -- --mode workerw .\web\index.html
```

### 前端调试建议

* 先用 `lively` 或 `fullscreen` 模式调样式和交互。
* 确认功能后再切回 `workerw` 检查桌面态效果。
* 涉及只读壁纸态 / 编辑态差异时，需要分别验证：
  - `ivoryWindowRole=wallpaper`
  - `ivoryWindowRole=editor`

## 当前已知限制

* Todo 的“编辑”目前使用浏览器 `prompt`，还不是内联编辑。
* deadline 使用原生 `datetime-local` 控件，样式可定制范围受 WebView 内核限制。
* `workerw` 模式依赖 Windows 桌面内部窗口层级，系统版本差异可能影响兼容性。
* 自定义背景导出为 JSON 时，如果图片很大，导出文件也会明显变大。

## 下一步可以继续做的方向

* Todo 内联编辑，而不是 `prompt`
* 更细的 deadline 视觉提醒
* 更完善的导入导出版本兼容
* 更系统的多屏配置管理

## License

当前仓库未单独声明开源许可证；如需公开发布，建议补充 `LICENSE` 文件。

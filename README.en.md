# local-tap-compatible — Local-first AI Infinite Canvas

> An infinite canvas + node-based AI workflow. Plug in **your own API keys** for image generation, video generation, reverse prompting, and more.

[![GitHub stars](https://img.shields.io/github/stars/jsxxwhai/localtapcompatible?style=for-the-badge&color=29b6f2)](https://github.com/jsxxwhai/localtapcompatible/stargazers)
[![License](https://img.shields.io/github/license/jsxxwhai/localtapcompatible?style=for-the-badge)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/jsxxwhai/localtapcompatible/ci.yml?branch=main&style=for-the-badge)](https://github.com/jsxxwhai/localtapcompatible/actions)
[![Release](https://img.shields.io/github/v/release/jsxxwhai/localtapcompatible?style=for-the-badge&color=29b6f2&label=Download%20EXE)](https://github.com/jsxxwhai/localtapcompatible/releases/latest)

> 中文说明见 [README.md](./README.md)

![Main UI](./docs/screenshot-main.png)

![Demo](./docs/demo.gif)

## ✨ Why local-tap-compatible?

A **fully local**, node-based infinite canvas. Chain "prompt → image/video generation → reverse prompt → output preview" into a visual node graph, using your own keys — nothing is uploaded to any cloud.

| Feature | Description |
| --- | --- |
| 🧩 Node workflow | Prompt, image gen, video gen, reverse prompt, upload, asset, preview output |
| 📥 Built-in examples | Text-to-image, image-to-video, reverse prompt, multi-reference — one click from the File menu |
| 🔌 Any API | Works with any custom HTTP endpoint (bring your own Base URL & key) |
| 🖥️ Infinite canvas | Zoom, pan, box-select, drag-to-connect node graph |
| 🌐 Multilingual | 简体中文 / English / 日本語 / 한국어, follows system locale, switchable anytime |
| 🛡️ Privacy-first | API keys stored locally only, zero cloud relay |
| 💻 Desktop app | Native Windows (WinForms + WebView2), single process, exits completely on close |

![Settings](./docs/screenshot-settings.png)

## 🚀 Quick Start

```bash
npm install
npm run dev   # frontend http://localhost:5173, backend http://localhost:3001
```

1. From the left palette, add: **Prompt → Image Generation → Preview Output**
2. Drag a connection from a node output handle to the next node input
3. Click the Image node and configure your API in the right panel (Base URL, path, model, request body)
4. Click **▶ Run** on a node, or **Run All** in the toolbar

## 🖥️ Desktop Build

```bash
npm run desktop:build   # outputs release/LocalTapCompatible.exe
```

**Zero background residency**: closing the window fully exits the app. ~390MB memory (including system WebView2 runtime), ~5MB on disk — lighter than Electron.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+S | Save canvas |
| Ctrl+Enter | Run all |
| Ctrl+D | Duplicate selected node |
| Ctrl+, | Open settings |
| Esc | Close help / tour / settings overlay |

## 📖 Docs

- **Interactions**: drag-connect, canvas context menu, box-select, panel drag, reverse prompting
- **API config**: multiple APIs per category, model fetching, connectivity test, async polling
- **Async video**: submit → poll status → fetch result, fully automatic

## 🗺️ Roadmap

- [x] Multilingual (zh/en/ja/ko)
- [x] Windows desktop app
- [x] Simple/Advanced settings mode
- [ ] macOS / Linux desktop builds
- [ ] Plugin / custom node system
- [ ] Workflow template marketplace

## 🤝 Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

[MIT](./LICENSE) © jsxxwhai

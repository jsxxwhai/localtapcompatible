# Show HN: local-tap-compatible — a local-first infinite canvas for AI workflows

## What it is

A fully local, node-based infinite canvas. Chain "prompt → image/video generation → reverse prompt → output preview" into a visual node graph — using **your own API keys**. Nothing is uploaded to any cloud.

## Why

Cloud SaaS routes your data and keys through third-party servers, while traditional node tools are powerful but intimidating for beginners. I wanted something "open it, plug in your own API, and immediately understand it."

## Highlights

- 🧩 Node workflow: prompt, text-to-image, text-to-video, reverse prompt, upload, asset, preview
- 🔌 Any API: OpenAI / SiliconFlow / Kling / Seedance / Runway or any HTTP endpoint; multiple APIs per category
- 🖥️ Infinite canvas: zoom, pan, box-select, drag-connect node graph
- 🌐 Multilingual: zh / en / ja / ko, follows system locale, switchable in the toolbar
- 🛡️ Privacy-first: keys stored only in local browser localStorage
- 💻 Desktop app: native Windows (WinForms + WebView2), single process, exits fully on close

## Quick start

1. Add: Prompt → Image Generation → Preview Output
2. Drag a connection
3. Configure your API (Base URL, path, model, body)
4. Click Run

## Stack

React + Vite + React Flow + Express (optional backend); desktop is C# WinForms + WebView2.

## Repo

https://github.com/jsxxwhai/localtapcompatible

Stars, issues, and PRs welcome. Let me know which node types or API presets you want next.

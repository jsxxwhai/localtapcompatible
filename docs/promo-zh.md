# 我做了一个本地 AI 无限画布：local-tap-compatible，接入你自己的 API Key

## 一句话介绍

一个**完全本地**的无限画布式 AI 工作流，把「提示词 → 图片/视频生成 → 倒推提示词 → 预览输出」串成节点式工作流，所有接口都用你自己的 Key，不上传任何云端。

## 为什么做这个

市面上要么是云端 SaaS（数据、Key 都经过别人服务器），要么是重到劝退新手的复杂节点工具。我想做一个「开箱即用、接自己 API、新手一看就懂」的本地画布。

## 核心特性

- 🧩 **节点式工作流**：提示词、文生图、文生视频、倒推提示词、图片上传、素材、预览输出
- 🔌 **任意 API**：兼容 OpenAI / SiliconFlow / 可灵 / Seedance / Runway 等任何 HTTP 接口，每个板块可配多个 API
- 🖥️ **无限画布**：缩放、平移、框选、拖拽连线，可视化交互
- 🌐 **多语言**：简体中文 / English / 日本語 / 한국어，默认跟随系统，顶部随时切换
- 🛡️ **隐私优先**：API Key 只存本地 localStorage，零云端中转
- 💻 **桌面版**：Windows 原生（WinForms + WebView2），单进程、关闭即退、不驻留，比 Electron 更轻

## 上手只需 4 步

1. 添加：提示词 → 图片生成 → 预览输出
2. 拖线连接
3. 配置你的 API（Base URL、路径、模型、请求体）
4. 点运行

## 技术栈

React + Vite + React Flow + Express（后端可选），桌面版 C# WinForms + WebView2。

## 仓库

https://github.com/jsxxwhai/localtapcompatible

欢迎 star / issue / PR！也欢迎告诉我你最想加的节点类型或 API 预设。

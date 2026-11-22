---
layout: base
title: SDK 与库
description: 官方 Sendspin SDK、库以及代码示例。
---

用于将 Sendspin 集成到你项目中的官方软件开发工具包（SDK）、参考实现和测试工具。刚接触该协议？请从[实现指南](/build/guide/)开始；[客户端章节](/build/guide/client/)说明了哪种 SDK 适合哪个平台。

想在命令行中试用 Sendspin？[sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli) 是推荐的 CLI 和参考播放器。

<!--
  Board item "Update website to promote sendspin-cpp-cli": done above — keep
  sendspin-cpp-cli as the recommended CLI/reference player wherever a CLI comes up.
-->

本页面列出了已达到 1.0 规范的实现。它们全部开源；底部的许可说明解释了这对你的项目意味着什么。

## 客户端 SDK

| 语言 | 仓库 | 角色 | 规范状态 | 使用者 |
|---|---|---|---|---|
| C++ | [sendspin-cpp](https://github.com/Sendspin/sendspin-cpp) | player, controller, metadata, artwork, visualizer, color | 1.0 | [ESPHome](https://esphome.io/), [sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli) |
| Python | [aiosendspin](https://github.com/Sendspin/aiosendspin) (client) | see repository | 1.0 | Test and reference client |
| JavaScript | [sendspin-js](https://github.com/Sendspin/sendspin-js) | player; see repository | 1.0 | [Music Assistant](https://www.music-assistant.io) web UI, the [live demo](/#live-demo) on this site |

**sendspin-cpp** is the library for devices. It runs on ESP32 through the ESP-IDF component registry (`sendspin/sendspin-cpp`) and on Linux, macOS and Windows hosts, decodes FLAC and PCM with Opus as an option, and has the Noise encryption built in. The repository's `integration-guide.md`, `internals.md` and `playback-sync.md` cover what the guide here does not. Apache 2.0.

**aiosendspin** 是异步 Python 库。其客户端部分已完整且符合规范，但最好将其视为参考和测试客户端：可以用它针对你的服务器编写脚本，或在规范让你拿不准时阅读它来解惑。PyPI 上的包名为 `aiosendspin`。Apache 2.0。

**sendspin-js** is the TypeScript client for browsers, with `SendspinPlayer` for a complete player and the lower-level `SendspinCore` for your own user interface. It handles the browser's user-gesture requirement and coarse clocks. On npm as `@sendspin/sendspin-js`.

## 服务器实现

| 语言 | 仓库 | 角色 | 规范状态 | 使用者 |
|---|---|---|---|---|
| Python | [aiosendspin](https://github.com/Sendspin/aiosendspin) (server) | all | 1.0 | [Music Assistant](https://www.music-assistant.io) |
| C++ | [sendspin-server-cpp](https://github.com/Sendspin/sendspin-server-cpp) | all | 1.0, early development | |

**aiosendspin** is the server inside Music Assistant, which makes it the reference server: whatever it does is what clients in the field expect. If you are building a server in Python, build on it.

**sendspin-server-cpp** is the C++ server library, for a media player, a sound-server sink or a small daemon that streams to Sendspin players. It runs on Linux and macOS hosts and builds as an ESP-IDF component, streams PCM, FLAC or Opus resampled for each player, and has the Noise encryption and pairing built in. `examples/server_cli` is a complete host to start from. It is in early development with no release yet, and its API changes without deprecation, so pin a commit if you build on it. Apache 2.0.

## 参考播放器和工具

- **[sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli)**: the recommended CLI and reference player. Headless, for Linux, Raspberry Pi, Apple-silicon macOS and Windows, with a guided installer. Start it with `sendspin-cli -n living-room` and you have a known-good player to compare your own against.
- **[sendspin-python-cli](https://github.com/Sendspin/sendspin-python-cli)**: a Python player (`pip install sendspin` or `uv tool install sendspin`) with an interactive terminal client, a daemon mode and a party mode.
- **[time-filter](https://github.com/Sendspin/time-filter)**: the C++ reference implementation of the clock-synchronization Kalman filter the specification requires, including the known-good burst strategy. Use it as is or port it line by line.
- **[conformance](https://github.com/Sendspin/conformance)**: the harness that runs every implementation against every other and publishes the [results matrix](https://sendspin.github.io/conformance/). Add an adapter for yours; the [testing chapter](/build/guide/testing/) explains how.
- **[sync-test](https://github.com/Sendspin/sync-test)**: measures the synchronization accuracy between two clients with a USB sound card.
- **[ma-pairing-e2e](https://github.com/Sendspin/ma-pairing-e2e)**: Playwright end-to-end tests of the Music Assistant pairing flow, which also record the walkthrough videos used in the guide.

其他语言的其他移植版本位于 [GitHub 组织](https://github.com/Sendspin)，当它们达到 1.0 规范时会列在此处。

## 参与贡献

Sendspin 是开源项目，欢迎贡献。访问 [GitHub 上的 Sendspin](https://github.com/Sendspin) 和 <a href="https://discord.gg/kaVm8hGpne" target="_blank"
    >Music Assistant Discord</a> 参与其中。指南的[贡献章节](/build/guide/contributing/)介绍了该项目的运作方式。

要发布你自己的 Sendspin 项目吗？该协议可以自由实现；SDK 许可证以及如何在你的项目名称中使用 Sendspin 名称，请参见[许可与商标](/licensing/)。

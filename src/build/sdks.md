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

**sendspin-cpp** 是面向设备的库。它通过 ESP-IDF 组件注册表（`sendspin/sendspin-cpp`）在 ESP32 上运行，也支持 Linux、macOS 和 Windows 主机，可解码 FLAC 和 PCM（可选 Opus），并内置 Noise 加密。仓库中的 `integration-guide.md`、`internals.md` 和 `playback-sync.md` 涵盖了本指南未涉及的内容。Apache 2.0。

**aiosendspin** 是异步 Python 库。其客户端部分已完整且符合规范，但最好将其视为参考和测试客户端：可以用它针对你的服务器编写脚本，或在规范让你拿不准时阅读它来解惑。PyPI 上的包名为 `aiosendspin`。Apache 2.0。

**sendspin-js** 是面向浏览器的 TypeScript 客户端，其中 `SendspinPlayer` 提供完整播放器功能，而更底层的 `SendspinCore` 则用于构建你自己的用户界面。它处理了浏览器的用户手势要求和粗略时钟问题。npm 上的包名为 `@sendspin/sendspin-js`。

## 服务器实现

| 语言 | 仓库 | 角色 | 规范状态 | 使用者 |
|---|---|---|---|---|
| Python | [aiosendspin](https://github.com/Sendspin/aiosendspin) (server) | all | 1.0 | [Music Assistant](https://www.music-assistant.io) |
| C++ | [sendspin-server-cpp](https://github.com/Sendspin/sendspin-server-cpp) | all | 1.0, early development | |

**aiosendspin** 是 Music Assistant 内部的服务器，因此它也是参考服务器：它的行为就是实际客户端所期望的行为。如果你正在用 Python 构建服务器，请基于它进行开发。

**sendspin-server-cpp** 是 C++ 服务器库，适用于媒体播放器、音响服务器接收器或向 Sendspin 播放器流式传输的小型守护进程。它支持 Linux 和 macOS 主机，也可作为 ESP-IDF 组件构建，可流式传输为每个播放器重新采样的 PCM、FLAC 或 Opus，并内置 Noise 加密和配对功能。`examples/server_cli` 是一个完整的起始主机。它仍处于早期开发阶段，尚未发布，其 API 会无弃用警告地变更，因此如果你基于它构建，请固定提交版本。Apache 2.0。

## 参考播放器和工具

- **[sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli)**：推荐的 CLI 和参考播放器。无头运行，支持 Linux、Raspberry Pi、Apple 芯片 macOS 和 Windows，并提供引导式安装程序。使用 `sendspin-cli -n living-room` 启动它，你就拥有了一个已知良好的播放器，可用于与自己的实现进行对比。
- **[sendspin-python-cli](https://github.com/Sendspin/sendspin-python-cli)**：一个 Python 播放器（`pip install sendspin` 或 `uv tool install sendspin`），带有交互式终端客户端、守护进程模式和派对模式。
- **[time-filter](https://github.com/Sendspin/time-filter)**：规范要求的时钟同步卡尔曼滤波器的 C++ 参考实现，包括已知良好的突发策略。你可以直接使用它，或逐行移植。
- **[conformance](https://github.com/Sendspin/conformance)**：用于将每个实现与其他所有实现进行对测的测试框架，并发布[结果矩阵](https://sendspin.github.io/conformance/)。为你的实现添加适配器；[测试章节](/build/guide/testing/)说明了具体方法。
- **[sync-test](https://github.com/Sendspin/sync-test)**：通过 USB 声卡测量两个客户端之间的同步精度。
- **[ma-pairing-e2e](https://github.com/Sendspin/ma-pairing-e2e)**：Music Assistant 配对流程的 Playwright 端到端测试，同时录制了指南中使用的演示视频。

其他语言的其他移植版本位于 [GitHub 组织](https://github.com/Sendspin)，当它们达到 1.0 规范时会列在此处。

## 参与贡献

Sendspin 是开源项目，欢迎贡献。访问 [GitHub 上的 Sendspin](https://github.com/Sendspin) 和 <a href="https://discord.gg/kaVm8hGpne" target="_blank"
    >Music Assistant Discord</a> 参与其中。指南的[贡献章节](/build/guide/contributing/)介绍了该项目的运作方式。

要发布你自己的 Sendspin 项目吗？该协议可以自由实现；SDK 许可证以及如何在你的项目名称中使用 Sendspin 名称，请参见[许可与商标](/licensing/)。

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
| C++ | [sendspin-cpp](https://github.com/Sendspin/sendspin-cpp) | 播放器、控制器、元数据、封面、可视化器、颜色 | 1.0 | [ESPHome](https://esphome.io/)、[sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli) |
| Python | [aiosendspin](https://github.com/Sendspin/aiosendspin)（客户端） | 参见仓库 | 1.0 | 测试和参考客户端 |
| JavaScript | [sendspin-js](https://github.com/Sendspin/sendspin-js) | 播放器；参见仓库 | 正在更新至 1.0 | [Music Assistant](https://www.music-assistant.io) 网页 UI、本站的[在线演示](/#live-demo) |

**sendspin-cpp** 是面向设备的库。它通过 ESP-IDF 组件注册表（`sendspin/sendspin-cpp`）运行在 ESP32 上，也可运行在 Linux 和 macOS 主机上，支持解码 FLAC 和 PCM（Opus 为可选项），并内置了 Noise 加密。仓库中的 `integration-guide.md`、`internals.md` 和 `playback-sync.md` 涵盖了本指南未涉及的内容。Apache 2.0。

**aiosendspin** 是异步 Python 库。其客户端部分已完整且符合规范，但最好将其视为参考和测试客户端：可以用它针对你的服务器编写脚本，或在规范让你拿不准时阅读它来解惑。PyPI 上的包名为 `aiosendspin`。Apache 2.0。

**sendspin-js** 是面向浏览器的 TypeScript 客户端，提供用于完整播放器的 `SendspinPlayer`，以及用于构建自己用户界面的更底层的 `SendspinCore`。它处理了浏览器的用户手势要求和粗略时钟。目前正在向 1.0 规范推进；在依赖某个具体特性之前，请先查看仓库了解当前状态。npm 上的包名为 `@sendspin/sendspin-js`。

## 服务器实现

| 语言 | 仓库 | 角色 | 规范状态 | 使用者 |
|---|---|---|---|---|
| Python | [aiosendspin](https://github.com/Sendspin/aiosendspin)（服务器） | 全部 | 1.0 | [Music Assistant](https://www.music-assistant.io) |
| C++ | 计划中 | 全部 | 尚未开始 | |

**aiosendspin** 是 Music Assistant 内部的服务器，因此它就是参考服务器：它怎么做，实际应用中的客户端就会怎样期待。如果你要用 Python 构建服务器，就应在它之上构建。面向嵌入式和桌面产品的 **C++ 服务器**已列入路线图，但尚未开始；如果你需要它，请在 Discord 上说出来，以便与你一起规划这项工作。

## 参考播放器和工具

- **[sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli)**：推荐的 CLI 和参考播放器。无界面（headless）运行，支持 Linux、树莓派和 Apple 芯片（Apple silicon）的 macOS，附带引导式安装程序。用 `sendspin-cli -n living-room` 启动它，你就拥有了一个已知可靠的播放器，可以用来与自己的实现进行对比。
- **[sendspin-python-cli](https://github.com/Sendspin/sendspin-python-cli)**：一个 Python 播放器（`pip install sendspin` 或 `uv tool install sendspin`），带有交互式终端客户端、守护进程模式和派对模式。
- **[time-filter](https://github.com/Sendspin/time-filter)**：规范所要求的时钟同步卡尔曼滤波器的 C++ 参考实现，包括经过验证的突发（burst）策略。可以原样使用，也可以逐行移植。
- **[conformance](https://github.com/Sendspin/conformance)**：让每个实现与其他所有实现相互运行测试的测试框架，并发布[结果矩阵](https://sendspin.github.io/conformance/)。为你的实现添加一个适配器；[测试章节](/build/guide/testing/)说明了具体方法。
- **[sync-test](https://github.com/Sendspin/sync-test)**：使用 USB 声卡测量两个客户端之间的同步精度。
- **[ma-pairing-e2e](https://github.com/Sendspin/ma-pairing-e2e)**：Music Assistant 配对流程的 Playwright 端到端测试，同时也会录制指南中使用的操作演示视频。

其他语言的其他移植版本位于 [GitHub 组织](https://github.com/Sendspin)，当它们达到 1.0 规范时会列在此处。

## 参与贡献

Sendspin 是开源项目，欢迎贡献。访问 [GitHub 上的 Sendspin](https://github.com/Sendspin) 和 <a href="https://discord.gg/kaVm8hGpne" target="_blank"
    >Music Assistant Discord</a> 参与其中。指南的[贡献章节](/build/guide/contributing/)介绍了该项目的运作方式。

要发布你自己的 Sendspin 项目吗？该协议可以自由实现；SDK 许可证以及如何在你的项目名称中使用 Sendspin 名称，请参见[许可与商标](/licensing/)。

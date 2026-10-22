---
title: 测试与认证
nav_title: Testing & certification
description: 如何针对真实对端、一致性测试套件和同步测试装置测试 Sendspin 实现，发布前应进行哪些配对与恢复演练，以及认证计划的当前进展。
section: Ship it
order: 50
---

先对真实对端进行测试，然后运行自动化一致性测试套件（conformance suite）并测量同步性能。

## 对真实对端进行测试

让你的实现与一个参考实现同时播放音乐。使用以下对端来测试每一个角色。

- **[sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli)** 是参考播放器。它可以在 Linux、Raspberry Pi 或 Apple 芯片 Mac 上以无头（headless）模式运行，带有引导式安装程序，并使用 `sendspin-cli -n living-room` 启动。在整个项目期间，让一个实例始终与你的设备并排运行；如果两者出现偏差，比较它们的时序来找出原因。
- **[sendspin-python-cli](https://github.com/Sendspin/sendspin-python-cli)** 是第二个独立的播放器（`pip install sendspin` 或 `uv tool install sendspin`）。用两个播放器重现同一个故障有助于缩小原因范围。
- **[Music Assistant](https://www.music-assistant.io)** 是参考服务器。如果你在构建客户端，请先针对它进行测试，并将其行为视为预期行为。
- **ESPHome 设备**，例如 Home Assistant Voice Preview Edition，是实际环境中的参考客户端，也是服务器在大多数家庭中会遇到的对象。
- **带有 [sendspin-js](https://github.com/Sendspin/sendspin-js) 的浏览器标签页**——它是 Music Assistant Web UI 以及本站[在线演示](/#live-demo)背后的客户端——时钟精度较低并且需要用户手势交互，这会触发原生播放器永远不会碰到的路径。
- **[aiosendspin](https://github.com/Sendspin/aiosendspin) 中的客户端**是一个可通过脚本控制的测试客户端。如果你在构建服务器，可以用 Python 脚本驱动它循环进行连接、配对、加入组和断开连接，并让每条消息都可见。

<div class="callout callout--tip">
<p class="callout__title">提示</p>

从一开始就在网络中放置不止一台服务器进行测试。Music Assistant 加上第二台服务器可以演练多服务器规则，而单服务器环境永远不会涉及这些规则：通过 `another_server` 进行的交接、绝不能被打断的配对，以及客户端记住上次从哪里播放。

</div>

## 运行一致性测试套件

[conformance](https://github.com/Sendspin/conformance) 仓库会让每个已知的实现与其他所有实现相互测试，并将结果以矩阵形式发布在 [sendspin.github.io/conformance](https://sendspin.github.io/conformance/) 上。每个单元格代表一个客户端针对一台服务器在一组场景下的表现：双向发起连接、各种流格式（PCM、FLAC、Opus 和 24-bit）、元数据、封面图片、控制器角色以及协议基线。

要添加你的实现，请按照 [`adapters/README.md`](https://github.com/Sendspin/conformance/blob/main/adapters/README.md) 编写一个适配器，它会告诉测试框架（harness）如何启动、停止和观察你的实现。然后设置一个工作区并运行全部测试：

```sh
python scripts/setup_workspace.py --clone
. .venv/bin/activate
python scripts/run_all.py
```

在迭代过程中，你通常只需要测试一对实现：

```sh
conformance run --from your-impl --to target-impl
```

按行和按列阅读矩阵。如果你的实现对所有对端都失败，先调查你自己的实现。如果它只对一个对端失败，就将两个实现与规范进行对比，并针对失败的场景提交一个 issue。

在你自己的 CI 中运行该套件；针对 sendspin-cpp-cli 或 aiosendspin 执行一次 `conformance run` 只需要一两分钟。然后用你的适配器提交一个 pull request，让公开矩阵中包含你的实现，这样任何实现的每次更改也都会针对你的实现进行测试。

## 测量同步

规范设定了稳态下 ±1 ms 的[精度下限](/build/spec/#sync-accuracy)和 ±0.5 ms 的目标值。两者都在音频输出处测量，以你自己的时间滤波器（time filter）所预测的本地时间应为多少为基准，并减去所配置的输出延迟。下限是测试套件和认证计划对你的硬性要求；而目标值则是让同一房间里的两个音箱听起来不发糊的保障。

[sync-test](https://github.com/Sendspin/sync-test) 测量两个客户端之间的实际偏移量：它通过两个客户端播放测试信号，用 USB 声卡的两个声道分别录制，并报告随时间变化的差异。将 sendspin-cpp-cli 放在一个声道，你的实现放在另一个声道，然后运行：

- **一小时的播放。**漂移和滤波器的稳定性只有随时间推移才会显现。记录一小时的偏移量，观察趋势，而不仅仅是平均值。
- **Wi-Fi 和以太网。**Wi-Fi 的往返时间更大且更不稳定，这正是时间滤波器的突发（burst）策略发挥作用的地方。[time-filter](https://github.com/Sendspin/time-filter) 参考实现每十秒背靠背进行约八次交换，并选用 `max_error` 最低的那个样本；如果你在同一网络下的指标比 sendspin-cpp-cli 更差，请先对照它的策略进行比较。
- **迟加入者。**先启动参考播放器并让它运行，然后让你的实现加入。你的实现应该在其滤波器收敛之后才变为可用，并以听不到跳变的方式进入同步。
- **跳转和切换曲目。**两者都会清空缓冲区并继续流。跳转之后的偏移量必须等于跳转之前的偏移量。

## 配对与恢复演练

用你的设备与一台服务器逐项进行这些演练。既要检查协议的行为，也要检查用户看到的内容。

- **配对状态下恢复出厂设置。**服务器的下一次连接会落入 [Sentinel 回退](/build/spec/#sentinel-fallback)。服务器不得播放，应告知其操作者并提供重新配对；客户端则以全新未配对设备的状态回归，其出厂身份和配对 PSK 保持完好。
- **通过与六台服务器配对来逐出记录。**客户端至少存储[五条配对记录](/build/spec/#pairing-records)，并且绝不因空间不足而让配对失败。确认第六次配对成功，并且被逐出的服务器收到的是清晰的凭据不匹配信号，而不是挂起。
- **在配对过程中断开网络。**在 `client/pair-init` 和最终确认步骤之间将接入点断电重启。双方都应超时、干净地中止并允许新的尝试，且任何一方都不会留下写了一半的记录。
- **连续五次输入错误代码。**静态配对窗口会在[第五次失败尝试](/build/spec/#pairing-window)后关闭；动态代码尝试在轮次上限处停止。检查设备是否通过你在文档中记载的操作者操作来恢复，以及服务器是否说明其停止的原因。
- **从备份恢复服务器。**服务器身份密钥必须保留，否则每台已配对的设备都会把恢复后的服务器当作陌生人。执行备份、擦除、恢复，并确认已配对的设备无需重新配对即可重新连接。
- **两台服务器相争。**先从一台服务器开始播放，再从另一台开始。落败的服务器收到 `another_server`，继续将设备显示为可用，并且不会陷入循环重连。然后从一台发起配对尝试、从另一台开始播放：配对尝试绝不能被中断。

## 各角色的互操作性检查清单

在你宣布某个角色完成之前，至少要对照两个对端进行验证。

| 角色 | 对端检查项 |
|---|---|
| `player` | 能播放来自 Music Assistant 的 PCM 和 FLAC；如果声明了则支持 Opus。仅在滤波器收敛后才可用。在 sendspin-cpp-cli 旁边保持 ±1 ms。音量、静音和输出延迟通过 `client/state` 完成往返同步。迟到的数据块被丢弃。 |
| `source` | Music Assistant 将捕获的音频同步分发给第二台播放器。时间戳包含漂移。在发送任何内容之前需要操作者批准。 |
| `controller` | 每条命令都作用于客户端自己的组。`switch` 在正在播放的组之间循环。组状态在加入后以及每次更改后到达。 |
| `metadata` | 计划中的更新出现在曲目边界处，而不是在到达时立即显示。容忍缺失的字段。 |
| `artwork` | 图像在每个通道上以所请求的大小和格式到达。没有封面的曲目会清除显示。 |
| `visualizer` | 帧在其时间戳处渲染。峰值始终存在；节拍事件可能缺席。 |
| `color` | 调色板随封面变化，并且对比度保证在你的显示屏上依然成立。 |

对于服务器，此表反向适用：将每个角色对照 sendspin-cpp-cli、ESPHome 设备和浏览器客户端运行，并且对于只能通过脚本才能触达的路径，对照 aiosendspin 的客户端运行。

## 认证

Sendspin 认证计划正在筹备中。认证将包含测试和象征性的费用，获认证后有权在产品及其营销中使用认证标志和徽标（logo），并会在本网站上获得列出。测试计划正在基于上述的一致性测试套件、同步测量和配对演练来构建，因此为之做准备就意味着完成本章所描述的工作并保留结果。

在该计划开放之前，商标规则以[许可页面](/licensing/)上的为准：你可以如实陈述你的产品实现了 Sendspin 或与其兼容，但在出售的产品上使用该名称或徽标需要获得许可。如果你想成为首批获得认证的产品之一，或者你的发布日期取决于认证，请发送电子邮件至 [sendspin@openhomefoundation.org](mailto:sendspin@openhomefoundation.org)。

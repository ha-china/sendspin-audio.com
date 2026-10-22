---
title: 逐步构建客户端
nav_title: Client step by step
description: 按您将要执行的顺序介绍构建 Sendspin 客户端的工作：SDK 选择、身份、hello 消息、时钟收敛、时序参数、输出延迟、同步、音量、让位、断开连接，以及发布前检查清单。
order: 20
---

按照以下顺序构建客户端。每个步骤都链接到相关的[规范](/build/spec/)规则和 SDK 钩子。详情请参阅[配对章节](/build/guide/client/pairing/)和[角色章节](/build/guide/roles/)。

## 1. 选择 SDK

为您的平台选择一个 SDK：

- **[sendspin-cpp](https://github.com/Sendspin/sendspin-cpp)** 是面向设备的 C++ 库。它通过 ESP-IDF 组件注册表（`sendspin/sendspin-cpp`）运行在 ESP32 上，也可运行在 Linux 和 macOS 主机上。您可以在设置客户端时添加所需的角色，而从不使用的角色可以在构建时排除，以节省闪存。您需要提供 `on_audio_write` 回调、一个网络就绪提供程序和一个持久化提供程序；该库会托管 WebSocket 服务器，并自行处理 Noise、解码和时间同步。
- **[aiosendspin](https://github.com/Sendspin/aiosendspin)** 是 Python。它是 Music Assistant 内部的服务端；其客户端部分主要用作测试和参考客户端。
- **[sendspin-js](https://github.com/Sendspin/sendspin-js)** 是面向浏览器的 TypeScript，目前正在更新以符合规范 1.0。

无论您选择哪一个，请先在 Raspberry Pi 或 Mac 上安装 [sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli)。将其用作参考播放器，与您自己的播放器进行比较。[SDK 页面](/build/sdks/)列出了所有内容。如果您使用的是 ESP32，请在编写任何代码之前先阅读 [ESPHome 章节](/build/guide/esphome/)。

## 2. 组件

<p><img src="/images/client-implementation-guide.jpg" alt="The components of a Sendspin client and the connection flow" /></p>

客户端由四个部分组成：mDNS 广播（`_sendspin._tcp` 以及 `path` TXT 记录）、一个供服务器连接的小型 WebSocket 服务器、Sendspin 核心（握手、消息、时间过滤器），以及您的输出端（sink）：音频输出，以及显示屏或灯光（如果有的话）。SDK 承担核心部分，在 sendspin-cpp 中还包括 WebSocket 服务器；广播和输出端则由您自己负责。

规范：[服务器发起的连接](/build/spec/#server-initiated-connections)、[加密](/build/spec/#encryption)。

## 3. 身份与需要持久化的内容

在进行其他工作之前，先确定持久化存储，因为有几项内容必须能在重启后保留：

- **X25519 密钥对**。`client_id` 由它派生而来，因此重新生成密钥会让每个认识该设备的服务器都把它当成陌生设备。
- **配对记录**，至少五个。当所有槽位都满时，逐出最久未使用的一条；配对绝不会因空间不足而失败。
- **音量和静音。**
- **输出延迟**，如果输出可能变化，则每个输出各保存一个。
- **配对失败计数器**（参见[轮次](/build/guide/client/pairing/#rounds-cooldown-and-the-operator-action)）。
- **最后播放的 server_id**，用于在两个空闲服务器之间做出选择。

在 sendspin-cpp 中，所有这些都要通过您的 `SendspinPersistenceProvider` 来实现。

规范：[身份](/build/spec/#identities)、[配对记录](/build/spec/#pairing-records)、[多服务器](/build/spec/#multiple-servers-server-initiated)。

## 4. 声明您能做什么

`client/hello` 是服务器了解自己在与什么对话的地方。请按优先顺序列出您的角色。所列格式中必须包含 `flac` 或 `pcm`，这样任何服务器都能为您提供服务；Opus 是可选的，并且在商用硬件上涉及第三方专利授权。无法无间隙切换采样率的播放器应当只列出一种采样率，让服务器进行重采样。在 `device_info` 中填写制造商、型号和固件版本。只有在有明确理由时才发送 MAC 地址：它是一个稳定的标识符。添加名称、您当前的 `unpaired_access` 设置以及您支持的配对方法。

规范：[`client/hello`](/build/spec/#client--server-clienthello)、[player@v1 支持对象](/build/spec/#client--server-clienthello-playerv1-support-object)。

## 5. 在报告可用之前先让时钟收敛

从连接建立的那一刻起就运行时间过滤器。[参考实现](https://github.com/Sendspin/time-filter)是一个可以拿来即用的卡尔曼滤波器，每十秒进行约八次时间交换的突发是经过验证的基准做法。在过滤器收敛之前不要报告 `available: true`；过早开始的播放器会不同步地播放，然后再进行可以听出来的校正。sendspin-cpp 会为您运行该过滤器。

规范：[时钟同步](/build/spec/#clock-synchronization)。

## 6. 如实报告时序参数

播放器状态中的两个数字会告诉服务器应该提前多久发送音频。`required_lead_time_ms` 是从启动触发到您能完整播放的第一个数据块之间的测量值；在流水线已预热的情况下，`stream/clear` 的该值通常低于冷启动的 `stream/start`，并且在流播放期间您可以将其调低。`min_buffer_ms` 取自到达延迟分布的上尾部（约第 95 百分位数），测量窗口要足够长以涵盖干扰情况，并经过防抖处理，使其不会因每次短暂波动而跳变。请报告能够可靠避免欠载（underrun）的最低值。虚报这些数字会给每位听众增加延迟，对于黑胶唱片机或电视这类实时音源尤其明显。

规范：[`client/state` 播放器对象](/build/spec/#client--server-clientstate-player-object)、[服务器音频发送约束](/build/spec/#server-audio-send-constraints)。

## 7. 设置静态输出延迟

在您测量播放的位置之后、您所知道的所有环节（DSP、功放、DAC 链路、外接扬声器）都应作为默认的 `output_delay_ms` 填入。让用户可以在 0 到 5000 毫秒之间进行调整，将其持久化保存；如果输出可能变化，则保存各自独立的值。端口之前的延迟（例如您自己的音频缓冲区）由您在内部自行补偿。降低延迟可能会使缓冲中的音频暂时多于您所报告的数量；请保持正常工作，必要时悄悄丢弃即可。

规范：[`client/state` 播放器对象](/build/spec/#client--server-clientstate-player-object)。

## 8. 保持同步

在输出端对照时间过滤器的预测来测量误差，而不是对照到达时间。校正必须不可闻，播放速度必须保持在 ±0.5% 以内，误差必须保持在 ±1 毫秒以内，并应力求达到 ±0.5 毫秒。丢弃已经迟到的数据块。在启动时和欠载之后一步到位地对齐到播放位置，而不是缓缓滑入。规范描述了一种无需插值的采样点丢弃与插入策略，适合小型 CPU；当您有足够的算力时，ASRC 是质量更高的替代方案。

<div class="callout callout--tip">
<p class="callout__title">部分迟到的数据块</p>

当某个数据块的开始时刻已经过去、但其尾部仍可播放时，将其解码并只丢弃迟到的前缀部分可以保持编解码器状态的连续性。丢弃整个数据块更简单，但会损失更多音频。

</div>

在 sendspin-cpp 中，您的 `on_audio_write` 回调接收的是校正后的 PCM；测量和校正由该库完成。

规范：[同步精度](/build/spec/#sync-accuracy)、[校正质量](/build/spec/#correction-quality)、[建议的校正策略](/build/spec/#suggested-correction-strategy)。

## 9. 音量

音量对应的是感知响度。使用 `(volume / 100)^1.5` 将其转换为振幅，并在一段短暂的渐变中应用变化。静音独立于音量：音量命令绝不会解除静音。无法远程驱动的硬件旋钮会在状态中上报，但不列入 `supported_commands`，因此服务器会将其显示为只读。

规范：[播放器消息](/build/spec/#player-messages)、[`client/state` 播放器对象](/build/spec/#client--server-clientstate-player-object)。

## 10. 让位于其他音源并重新收回

只有在您不会让位的情况下才报告 `available: false`：例如 HDMI 正在使用中、存在蓝牙会话，或输出被另一个协议占用。如果 Sendspin 随时都能收回设备，请保持可用状态，并改为发送 `client/leave`，从而停止参与该群组。在不可用期间仍要继续处理 `stream/start`、`stream/clear` 和 `stream/end`；这些消息可能已在网络上与您的状态更新交错到达。本身也是音源的设备（例如电视）从不在本地播放自己的输入；它只播放服务器传回的内容。

规范：[外部音源处理](/build/spec/#external-source-handling)、[音源消息](/build/spec/#source-messages)。

## 11. 礼貌地断开连接，合理地重连

发送 `client/goodbye` 时附上符合情况的原因：切换服务器时用 `another_server`，关机时用 `shutdown`，稍后会回来时用 `restart`，被用户断开时用 `user_request`。在服务器发起的设置中，由服务器进行重连。在客户端发起的设置中，连接丢失后按指数退避进行重连，从一秒开始、每次翻倍，上限为 30 秒，重试次数不设上限。在 Noise 失败后同样要进行退避。

规范：[`client/goodbye`](/build/spec/#client--server-clientgoodbye)。

## 12. 根据播放状态为外接功放供电

`group/update` 会告诉您所在的群组是否正在播放。正在播放时打开功放，并在厂商选定的空闲时间之后将其关闭。

规范：[`group/update`](/build/spec/#server--client-groupupdate)。

## 13. 恢复出厂设置

恢复出厂设置会将设备恢复到出厂时的内容（身份密钥对、配对 PSK、静态配对码、校准后的输出延迟），并清除此后累积的所有内容，包括配对记录。

规范：[定义](/build/spec/#definitions)。

## 14. 发布之前

- 身份信息能在重启和断电后保留。
- 配对记录能在重启后保留。
- 播放器在报告可用之前已完成收敛。
- 启动时或跳转（seek）之后没有可闻的颤音。
- 一小时内与参考播放器（sendspin-cpp-cli）的偏差保持在 ±1 毫秒以内。
- 能挺过服务器重启和网络中断，并无需人工干预即可自行恢复。
- 输出延迟已持久化且可调整。
- 音量曲线遵循公式；静音与音量相互独立。
- 通过[一致性测试套件](/build/guide/testing/)。
- 商标使用已对照[许可与商标](/licensing/)进行核查。

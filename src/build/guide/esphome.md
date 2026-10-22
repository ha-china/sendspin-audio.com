---
title: 使用 ESPHome 构建
nav_title: ESPHome
description: 使用 ESPHome 在 ESP32 上构建 Sendspin 固件；介绍 ESPHome 的 sendspin 组件包含哪些内容、通过 Home Assistant 进行引导设置如何省去配对步骤、一个示例配置，以及何时应直接改用 sendspin-cpp。
section: Building a client
order: 22
---

使用 ESPHome 为 ESP32 构建 Sendspin 播放器，无需编写 C++。[ESPHome](https://esphome.io) 提供了一个 `sendspin` 组件，它封装了 [sendspin-cpp](https://github.com/Sendspin/sendspin-cpp)，并将其接入 ESPHome 音频栈的其余部分。你用 YAML 描述硬件，ESPHome 构建固件，Home Assistant 则负责引导设置、更新和配对。

## 组件包含的内容

该组件是一个 hub 加上一组平台：

- `sendspin:` 是 hub（中心组件）。它接受可选的 `manufacturer`、`model` 和 `firmware_version`，用于 `client/hello` 中的 `device_info`；还接受 `task_stack_in_psram`，适用于内部 RAM 紧张的板卡。它会自动启用 ESPHome 的高性能网络功能。
- 一个 `media_source` 平台 `sendspin`，它就是播放器角色。它向 `speaker_source` 媒体播放器提供数据，后者可驱动任何 ESPHome 扬声器管线：I2S DAC、内部 DAC、带独立重采样器和混音器的扬声器。其 `initial_static_delay` 和 `static_delay_adjustable` 选项分别对应[输出延迟](/build/guide/client/#7-set-the-static-output-delay)，以及用户是否可以更改它。
- 一个 `media_player` 平台 `sendspin`，它就是控制器角色：它将设备所在的组以 Home Assistant 媒体播放器的形式暴露出来，具备播放、暂停、下一曲和音量功能。
- 一个 `text_sensor` 平台，其 `type` 为 `title`、`artist`、`album` 或 `album_artist`；以及一个 `sensor` 平台，对应 `track_progress`、`track_duration`、`year` 或 `track`。
- 一个用于专辑封面的 `image` 平台，可按你的显示屏所需的 `format` 和 `resize` 尺寸，从专辑或艺术家通道获取图像。
- 用于启动和停止 Sendspin 客户端、以及允许访客访问的 `switch` 实体（entity）——后者是 Home Assistant 对[未配对访问](/build/guide/client/pairing/#unpaired-access-is-your-default-to-choose)的称呼。

其底层是未经修改的 sendspin-cpp。该库的设计目标是被 ESPHome 使用，但本身不依赖 ESPHome 的任何内容，因此你在这里学到的知识在你将来脱离 ESPHome 时依然适用。ESPHome 的最低版本要求为 2026.3。带 PSRAM 的 ESP32-S3 是比较从容的目标。普通 ESP32 也能胜任播放器角色，但需要小心管理 RAM——`task_stack_in_psram` 选项以及在扬声器管线中只选择单一采样率正是为此而设。

[ESPHome 文档](https://esphome.io/components/sendspin/)中有每个平台的完整选项列表。

## 通过 Home Assistant 引导设置

用户获得的体验与正常的 ESPHome 体验一致。他们给设备上电，通过 Improv 或在 ESPHome 仪表盘（dashboard）中采纳设备的方式将其添加到 Home Assistant；从那时起，他们就能获得 OTA 更新，以及一个包含其全部实体的设备页面。

Home Assistant 会将设备的配对 PSK 交给 Music Assistant，因此该设备在 Music Assistant 中显示时就已经处于配对状态，无需输入任何代码，也无需扫描二维码。手动配对方法对家中的其他服务器仍然可用：手机应用或第二台音乐服务器仍会按照[配对章节](/build/guide/client/pairing/)中描述的方式进行配对。

访客模式开关从 Home Assistant 这一侧控制未配对访问，因此用户可以在仪表盘上决定未配对的服务器是否可以在该设备上播放。对于需要符合 EN 18031 默认合规要求的产品，可以使用一个动作（action）让固件在设置好每台设备专属的密钥之后才启用 Sendspin，从而确保设备绝不会以共享密钥或空密钥进行监听。

<div class="callout callout--example">
<p class="callout__title">Music Assistant 就是这么做的</p>

Music Assistant 从 Home Assistant 获取设备的配对 PSK，并在首次连接时完成配对 PSK 流程。双方各自存储一条普通的配对记录，与基于代码的配对之后所做的一样。其他服务器则通过设备所通告的方法与其配对。

</div>

## 示例配置

请根据你的硬件调整引脚、板卡型号、采样率和名称。实体名称就是用户在 Home Assistant 中看到的名称。

```yaml
# Example: an ESP32-S3 driving an external I2S DAC. Adapt to your board.
esphome:
  name: shelf-speaker
  friendly_name: Shelf Speaker

esp32:
  board: esp32-s3-devkitc-1
  framework:
    type: esp-idf

psram:
  mode: octal
  speed: 80MHz

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

api:
ota:
  - platform: esphome
improv_serial:

i2s_audio:
  - id: i2s_out
    i2s_lrclk_pin: GPIO45
    i2s_bclk_pin: GPIO46

speaker:
  - platform: i2s_audio
    id: dac_speaker
    i2s_audio_id: i2s_out
    i2s_dout_pin: GPIO47
    dac_type: external
    sample_rate: 48000
    bits_per_sample: 32bit
    channel: stereo

sendspin:
  manufacturer: Example Audio
  model: Shelf Speaker
  firmware_version: "1.0.0"

# The player role: Sendspin audio into the speaker pipeline.
media_source:
  - platform: sendspin
    id: sendspin_source
    initial_static_delay: 0ms      # delay of the DAC and amplifier behind the port
    static_delay_adjustable: true  # let the user fine-tune it from Home Assistant

media_player:
  - platform: speaker_source
    id: speaker_player
    name: Speaker
    media_pipeline:
      speaker: dac_speaker
      sources:
        - sendspin_source
  # The controller role: the group this device is in, as a media player entity.
  - platform: sendspin
    name: Sendspin group

text_sensor:
  - platform: sendspin
    type: title
    name: Title
  - platform: sendspin
    type: artist
    name: Artist

switch:
  # Starts and stops the Sendspin client. The guest access switch is
  # configured the same way; see the ESPHome documentation.
  - platform: sendspin
    name: Sendspin
```

刷写固件，在 Home Assistant 中采纳该设备，它就会作为播放器出现在 Music Assistant 中。测量端口之后 DAC 和功放的延迟并填入 `initial_static_delay`，然后将该设备与树莓派上的 [sendspin-cpp-cli](https://github.com/Sendspin/sendspin-cpp-cli) 进行对比，以检查同步情况。

<span id="why-this-is-the-fast-lane"></span>

## ESPHome 替你处理的事项

- **OTA 与配置。** ESPHome 的更新机制和 YAML 配置取代了你原本不得不自己编写的构建系统、更新程序和设置存储。
- **Home Assistant 集成（integration）。** 实体、设备页面、自动化（automation）以及向 Music Assistant 交接配对信息，这些都由 ESPHome 原生 API 提供。
- **通往认证的路径。** 以这种方式构建的设备可以满足 [Made for ESPHome](https://esphome.io/guides/made_for_esphome) 的条件，并使用一致性测试套件所针对的 SDK 通过 [Sendspin 测试与认证](/build/guide/testing/)。
- **协议实现。** sendspin-cpp 负责 Noise、时间滤波器、解码和同步校正，并且由项目方维护。

## 何时直接使用 sendspin-cpp

在以下情况下，请抛开 ESPHome 直接使用 sendspin-cpp：

- 你的芯片不是 ESP32，或者你运行自定义的 RTOS 或 Linux 构建；
- 你已经拥有更新系统和配置存储，不想再引入第二套；
- 你需要对线程、内存布局或音频路径的控制，而组件并未暴露这些能力。

你使用的仍是相同的库、相同的钩子，线上的行为也完全一致。[客户端分步指南](/build/guide/client/)一章正是为这条路径而写的。

## 已经运行它的硬件

[Home Assistant Voice Preview Edition](https://www.home-assistant.io/voice-pe/) 就是通过该组件提供 Sendspin 的，因此有一款量产设备可供对比；在你设计自己的电路板之前，其公开的配置是有关引脚映射、PSRAM 配置和扬声器管线的实用参考。

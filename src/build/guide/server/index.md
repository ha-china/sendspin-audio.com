---
title: 逐步构建服务器
nav_title: Server step by step
description: 按你会遇到这些工作的先后顺序介绍如何构建 Sendspin 服务器：发现、身份、激活、编码、时序、元数据、控制器语义、音源、可用性、重连与多服务器礼仪。
order: 30
---

服务器负责发现客户端（client）、为每个客户端编码一路流、让它们保持同一条时间线，并管理配对、分组和音量。下面的每个步骤都链接到相关的规范规则。用户界面相关内容见[用户对服务器的期望](/build/guide/server/ux/)；配对背后的原理见[信任模型](/build/guide/pairing-and-encryption/)。

## 1. 选择你的基础

如果你使用 Python，可以从 [aiosendspin](https://github.com/Sendspin/aiosendspin) 开始，这是运行在 Music Assistant 内部的 Apache 2.0 服务器。它负责握手、每个客户端的编码器、预发送（send-ahead）和配对。你需要实现队列、用户界面和分组策略。路线图上还有 C++ 服务器。对于其他任何语言，请基于[规范](/build/spec/)来实现，并从第一天起就运行[一致性测试套件](/build/guide/testing/)。无论你构建什么，都要在旁边保留一个 Music Assistant 实例，作为比较行为的参照。

## 2. 发现

浏览查找 `_sendspin._tcp`，并连接到找到的每一个客户端。这是服务器发起（server-initiated）模式，也是存在多台服务器时有明确行为定义的模式。同时也要自己广播 `_sendspin-server._tcp`，端口 8927，并带有 `path` TXT 记录，这样客户端发起的设备、脚本和测试工具才能找到你。服务器两种都支持；由客户端来选择其一。

TXT 中的 `name` 是发现阶段的提示，因此仅读取名称并不需要建立连接。不过直接连接也没问题：hello 交换会在客户端决定是否接纳你之前完成，而且一个活动为空的连接不会打扰正在从另一台服务器播放的客户端。

规范：[服务器发起的连接](/build/spec/#server-initiated-connections)、[客户端发起的连接](/build/spec/#client-initiated-connections)。

## 3. 身份

使用 CSPRNG 一次性生成服务器密钥对。公钥就是你的 `server_id`：每个客户端都靠它识别你，配对记录也是以它为名归档的。新密钥就是新服务器。没有任何已配对的设备会认得它，操作者必须重新配对所有设备。把私钥放入备份和恢复集，并在服务器迁移到新硬件时一并带走。

规范：[身份](/build/spec/#identities)。

## 4. Hello 与激活

握手完成后，发送带有你的名称和操作者 `languages` 的 `server/hello`。设备会使用这份列表来选择播报或显示配对码所用的语言，因此要发送操作者已配置的语言。读取 `client/hello`：其中包含角色、格式、`device_info`、设备是否允许未配对访问，以及它提供的配对方式。当客户端列出了你没有实现的角色或版本时，要把它当回事。这说明客户端使用的修订版本比你的新，你的服务器需要更新。

然后用 `server/activate` 声明你的目的：只有当你将在这台客户端上播放时才使用 `playback`，配对尝试进行期间使用 `pairing`，其他情况下什么都不声明。活动的目的一结束就立即撤销它。客户端会根据声明的最高级别活动在多台服务器之间仲裁，因此音乐停止后仍滞留不去的 `playback` 会阻止下一台服务器使用该设备。

规范：[`server/hello`](/build/spec/#server--client-serverhello)、[`client/hello`](/build/spec/#client--server-clienthello)、[`server/activate`](/build/spec/#server--client-serveractivate)、[检测过期的服务器](/build/spec/#detecting-outdated-servers)。

## 5. 格式与编码

你必须能够提供 FLAC 和 PCM。Opus 是可选的，且受第三方专利保护；随设备出货的商业产品需要向专利池支付每台设备的费用，这一点请与你的授权团队商定。为每个客户端分别编码；一个分组里可能同时混有需要 44.1 kHz 16-bit FLAC 的微控制器和接受 96 kHz 24-bit 的桌面设备。只列出单一采样率的客户端无法无间断地切换；要为它重采样。当客户端在流活跃期间更改其 `format` 偏好时，要重新推导该流，若有变化则发送新的 `stream/start`。

把整个队列当作每个客户端的一条连续流。曲目变更不会结束流，这正是实现无缝播放和交叉淡入淡出的关键。跳转或切换到另一曲目是 `stream/clear`，绝不要用 `stream/end`。

规范：[播放器支持对象](/build/spec/#client--server-clienthello-playerv1-support-object)、[`stream/start`](/build/spec/#server--client-streamstart)、[`stream/clear`](/build/spec/#server--client-streamclear)、[`stream/end`](/build/spec/#server--client-streamend)。

## 6. 时序与缓冲

每个数据块都带有它播放时的服务器时间。在从空状态 `stream/start` 或 `stream/clear` 之后，将第一个数据块安排在至少 `min_buffer_ms + output_delay_ms` 之后播放，并且只有在不增加延迟的前提下才把提前量向 `required_lead_time_ms` 扩展：对于媒体库曲目，可以；对于唱盘机，不行。数据块为 15 到 150 ms。在一个分组中，预发送量取各成员中的最大值；每次有成员加入、离开或时序更新时都要重新计算，当它下降时，在更低延迟（缩减）和不出现毛刺（保持）之间做出抉择。

对于有缓冲的内容，将每个播放器填充至其 `buffer_capacity`；统计时会计入每个数据块的头部加载荷，直到其完成时间过去为止。对客户端发送的时序更新进行去抖动处理，避免某个吵闹的设备每隔几秒就重新调度整个分组。后加入者只会收到未来的时间戳，因此它会先缓冲，然后踩着节拍加入。`server_transmitted` 和 `send_ahead` 要尽可能晚地取值，就在加密之前；在数据块入队时取的时间戳会扭曲客户端的延迟测量。

规范：[服务器音频发送约束](/build/spec/#server-audio-send-constraints)、[播放器缓冲统计](/build/spec/#player-buffer-accounting)、[发送时间戳](/build/spec/#transmit-timestamps)。

## 7. 元数据、封面与颜色

激活 `metadata`、`controller` 或 `color` 时，发送当前状态。封面（artwork）流开始时，在每个通道上都发送当前图像；曲目中途加入的显示屏不能一直空白到下一首歌。针对下一曲的更新带有未来的时间戳，并且最多提前 20 秒发出。

封面以最多 65519 字节的分段传输。要控制节奏：在同一连接上背靠背发送的大图像会排到音频数据块前面，播放器会把它听成抖动。调色板附带对比度规则：每个背景与其上的文字之间要达到 4.5:1，发送前请先检查。

<div class="callout callout--example">
<p class="callout__title">Music Assistant 是这样做的</p>

Music Assistant 在把下一曲排入流时就发送该曲目的元数据、封面和颜色，比可听到的变化提前几秒。这样既符合 20 秒规则，又让显示屏有时间在需要之前接收封面。

</div>

规范：[`server/state`](/build/spec/#server--client-serverstate)、[计划元数据更新](/build/spec/#scheduled-metadata-updates)、[计划封面的服务器规则](/build/spec/#server-rules-for-scheduled-artwork)、[计划颜色更新](/build/spec/#scheduled-color-updates)。

## 8. 控制器语义

在队列为空时执行 `play` 会恢复分组上次播放的内容，而且这份历史记录要在服务器重启后依然保留；墙壁面板上的单个按钮依赖于此。对于分组音量：从当前平均值计算出增量，将其应用到每个支持音量的播放器，进行钳制，把钳制损失的量重新分配给其余播放器，然后向每个播放器各发送一条命令。报告了音量但没有列出 `volume` 命令的播放器带有物理旋钮；以只读方式显示其音量级别。`switch` 会让客户端依次循环：先是在播放的多客户端分组，然后是单独播放的播放器，再是它自己的独奏分组；如果它的上一个分组还停在那里，则该分组优先。

规范：[命令行为](/build/spec/#command-behaviour)、[Switch 命令循环](/build/spec/#switch-command-cycle)、[控制器状态对象](/build/spec/#server--client-serverstate-controller-object)。

## 9. 音源

音源（source）会将其时间过滤器反向使用，在你的时间域内为每次采集打上时间戳。不要在这些时间戳处对音频进行切割。根据到达的采样估计音源的有效采样率，用这些时间戳来锚定流并检测间隙，并用异步采样率转换来吸收速率偏差。网络停顿后，时间戳可能发生跳变；保持连续的是采样数据。

在你发送 `start` 之前不会有任何内容传输，而只有在操作者明确批准该设备作为音源之后，你才能发送 `start`。在音箱上按下播放算是对播放的默许；但它绝不等同于对某个输入的批准。然后制定自动切换策略：带线路感应的音源会报告 `signal`，当唱针落下时你就可以启动房间。

<div class="callout callout--example">
<p class="callout__title">Music Assistant 是这样做的</p>

Music Assistant 会在已获批准的输入报告信号时启动房间播放，并在信号消失时停止，同时允许用户按音源关闭该行为。这个关闭开关很重要：一个带有嗡嗡声的输入会整天报告信号，而一台同时充当音源和播放器的设备，可能在每次电视开机时都启动自己的房间。

</div>

规范：[音源消息](/build/spec/#source-messages)、[音源音频数据块](/build/spec/#client--server-source-audio-chunks-binary)。

## 10. 可用性与分组

当客户端报告 `available: false` 或发送 `client/leave` 时，把它所在的分组记为上一个分组，将它移到属于它自己的已停止独奏分组中，结束它的流，并通过 `group/update` 告知它。当它回来时，让它留在那里：只有通过明确的 `switch` 或你界面中的操作，它才会重新加入。消息会在途中交错：客户端在不可用状态下仍会继续处理你的流消息，因此请发送 `stream/end` 并让状态稳定下来。

规范：[外部音源处理](/build/spec/#external-source-handling)。

## 11. 重连

遵循告别原因。`restart` 时要重连；连接静默断开时，如果其活动为空或包含 `playback`，也要重连，因为这很可能同样是一次重启。`another_server`、`user_request`、`shutdown`、`unpaired` 或 `pairing_required` 时不要重连；`concurrent_attempt` 时稍后重试。Noise 握手反复失败时按指数退避。对于前往其他服务器的客户端，将其显示为可用；当操作者请求或下一个播放命令需要时再重新连接。

规范：[`client/goodbye`](/build/spec/#client--server-clientgoodbye)、[失败处理](/build/spec/#failure-handling)。

## 12. 多服务器礼仪

一个家里有多台服务器是常态。你会失去客户端给别的服务器，也会把它们要回来。绝不要争抢：当客户端说 `another_server` 时，停下；当它说 `concurrent_attempt` 时，等待。无事可做时保持你的活动为空，这样真正有事要做的服务器才能赢得该设备。客户端会记住上次在它上面播放的是哪台服务器，并在空闲连接中优先选择那台。

规范：[多台服务器](/build/spec/#multiple-servers-server-initiated)。

## 13. 发布之前

- 身份密钥已加入备份和恢复集，并且在新硬件上恢复后每一条配对都得以保留。
- 两种发现模式都能工作：你会连接到广播中的客户端，客户端发起的设备也能找到你。
- [一致性测试套件](/build/guide/testing/)全部通过。
- [用户对服务器的期望](/build/guide/server/ux/)中的各种状态和流程在你的界面中都已存在。
- 你已经针对 sendspin-cpp-cli、一台 [ESPHome 设备](/build/guide/esphome/)以及浏览器中的 [sendspin-js](https://github.com/Sendspin/sendspin-js) 进行过播放、配对和取消配对。

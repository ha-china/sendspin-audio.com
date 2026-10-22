---
title: 用户对服务器的期望
nav_title: Server UX
description: Sendspin 服务器必须支持的用户旅程，包括发现设备、批准或配对设备、播放并保持设备正常工作，以及需要设计的界面状态。
order: 31
---

你的服务器需要一个设备列表、批准与配对控件，以及帮助用户从错误中恢复的消息。本章介绍这些界面及其背后的协议规则。同一流程中设备侧的内容见[客户端配对](/build/guide/client/pairing/)；其背后的设计思路见[信任模型](/build/guide/pairing-and-encryption/)。

## 发现：设备列表

在每个已发现的客户端下方显示其 `client/hello` 中的名称，并在旁边附上来自 `device_info` 的厂商和型号，这样“厨房”就能被一眼认出是那台音箱而不是壁挂平板。规范要求三种在视觉上可区分的状态：已配对、已批准未配对访问（approved for unpaired access）、以及未知（两者皆非）。一个声称使用了熟悉名称的新客户端绝不能被误认为现有设备。如果未知设备中出现第二个“厨房”，操作者应当能看出区别；如果两者看起来完全一样，攻击者只需给笔记本电脑起一个音箱的名字就能得逞。

对于正在由另一台服务器播放的设备，显示第四种状态。你与它的连接以 `another_server` 结束，或因 `concurrent_attempt` 被拒绝；此时应将其显示为可用，如果知道它去了哪里就加以说明，并让下一条播放命令把它夺回来。

规范：[未配对访问](/build/spec/#unpaired-access)、[`client/goodbye`](/build/spec/#client--server-clientgoodbye)。

## 批准或配对

### 未配对访问的批准

支持未配对访问的设备会为它的操作者所批准的任何服务器播放。为批准提供一个专用控件，例如设备所在行上的“允许此设备”或类似按钮。对于播放角色，你也可以把一个明确表示“使用此设备”的操作作为默示批准，比如直接在设备上按下播放；给刚开箱的音箱按下播放键就听到音乐，正是人们从投屏（casting）中熟悉的那种体验。绝不要对源（source）角色默示批准：输入源只能通过明确的控件获得批准。批准在重启后依然有效，操作者可以撤销它，设备配对时它会被丢弃，因为配对取代了它。

规范：[未配对访问](/build/spec/#unpaired-access)、[源消息](/build/spec/#source-messages)。

### 配对作为一种操作

为每个未知客户端提供清晰可见的配对操作，并为已批准的客户端保留配对作为升级途径。设备的 `client/hello` 会告诉你它提供哪种配对码方式，以及它的静态配对码位于何处：印在设备上，或印在包装盒内的说明单上。用户仅凭这一配对码完成配对，别无其他，因此配对操作应启动设备所列出的那一种配对码方式；如果两者都出现，优先使用动态配对码。仅当你的界面能够扫描二维码时才选择 `qr_code` 格式。没有摄像头的桌面应用则要求输入数字。

每台设备也都实现了配对 PSK 方式，但不要让它进入面向用户的流程。它是为自动化准备的：Home Assistant 把 ESPHome 设备的令牌交给 Music Assistant，设备随即显示为已配对，全程无人被询问任何问题。通过 API 或高级设置页面将它提供给集成（integration）和管理员。不要把它放进配对码输入界面。无论在哪里接受令牌，都要宽松地解析：去除首尾空白、转为大写、接受带或不带 `SP:` 前缀的输入，并把 `9` 读作 `2`，因为令牌字母表用其中一个替代另一个。在开始之前，检查令牌内的客户端密钥是否是该连接的 `client_id`。如果令牌属于另一台设备，先解释这种不匹配，然后再开始握手。

规范：[配对方式描述符](/build/spec/#client--server-clienthello-pair-method-descriptor)、[配对令牌](/build/spec/#pairing-token)、[配对 PSK 流程](/build/spec/#pairing-psk-flow)。

### 输入配对码

每位数字显示一个输入格，并按照设备对它们的分组方式来分组：动态配对码为 `123-456`，静态配对码为 `1234-5678`。分组能让预期的长度一目了然；无论是键入还是粘贴的内容，都要去掉其中的连字符和空格。对于会朗读配对码的设备，在开始尝试之前增加一个步骤：“按下继续，音箱将读出一个六位数的配对码。”第一轮一开始设备就会朗读配对码，而当时还在看着手机的操作者只好请求再来一轮；设备最多允许二十轮，之后就会坚持要求按一次按钮。

动态配对码输错后，设备会要求再来一轮，并再次显示或朗读同一个配对码。静态配对码输错后，本次尝试即告失败，你需要开始一次新的尝试，且不能超出设备配对窗口所允许的五次。提示“该配对码不匹配”，并把光标放回第一个输入格。当设备暂时搁置一次尝试时，它会发送 `client/pair-pending`，有时附带一条 `message`，例如“请按背面的配对按钮”。请逐字显示这条消息，作为归于设备名下的纯文本，绝不要将其渲染为标记或链接，因为它来自一个你尚未验证身份的对端。等待期间要应用你自己的超时机制；从不回应的设备不能让加载图标永远转下去。取消按钮会发送带 `user_cancelled` 原因的 `pair/abort`，随后发送一个离开配对的激活（activation），这样设备就能显示尝试结束的原因。

规范：[配对码展示](/build/spec/#pairing-code-presentation)、[轮次](/build/spec/#rounds)、[配对窗口](/build/spec/#pairing-window)、[`client/pair-pending`](/build/spec/#client--server-clientpair-pending)、[`pair/abort`](/build/spec/#client--server-pairabort)、[进入和离开配对](/build/spec/#entering-and-leaving-pairing)。

<div class="callout callout--example">
<p class="callout__title">Music Assistant 是这样做的</p>

配对从播放器选择器开始：未知音箱在其名称旁显示配对操作，操作者选择设备提供的方式，随后打开的配对码输入界面为每位数字提供一个输入格。

<figure>
<video controls preload="metadata" poster="/images/video-poster.svg" src="/videos/ma-pairing.mp4"></video>
<figcaption>Music Assistant：使用配对码为音箱配对。由端到端测试自动录制。</figcaption>
</figure>

[Music Assistant 端到端测试](https://github.com/Sendspin/ma-pairing-e2e)会在每次运行时重新生成这段录像。

</div>

### 配对之后

双方都持久化了记录之后，你用新密钥对现有连接重新握手。什么都不会关闭，正在运行的流继续运行。从那时起将设备显示为已配对。在设备页面上提供取消配对（unpair）：`server/unpair` 让双方都忘记这条记录，设备以 `unpaired` 为原因道别，随后它再次成为未知设备，直到有人批准或配对它。

规范：[重新握手](/build/spec/#re-handshake)、[`server/unpair`](/build/spec/#server--client-serverunpair)。

### 凭据不匹配

你配对过的设备可能会不再认得你：它被恢复出厂设置，它为给另一台服务器腾出空间而驱逐了你的记录，或者一次配对在两条 finalize 消息之间被中断。此时握手会回退到 Sentinel 密钥，并在已完成身份验证的前提下告诉你：设备无法使用你的凭据。不要悄无声息地以未配对会话继续运行。规范禁止在你的记录仍存在时在该设备上播放，而静默回退正是中间人（man in the middle）求之不得的事情。在设备上显示警告“此设备不再识别此服务器”，列出可能的原因，并提供重新配对，它会替换原来的记录。

规范：[Sentinel 回退](/build/spec/#sentinel-fallback)、[配对记录](/build/spec/#pairing-records)。

## 播放

重命名设备、在分组之间移动它以及调整其音量，都绝不能中断播放。设置更改后重新连接会重置设备的时钟滤波器（clock filter），在滤波器收敛所需的几秒钟里，设备回来时会出现延迟且不同步。分组是服务器侧的概念，因此重新分组就是一次 `group/update` 加一条新的流，而不是一次新的连接。

在 `server/hello` 中发送操作者的语言。朗读配对码的音箱或显示待处理消息的显示屏会从该列表中选择自己的语言，设置了加泰罗尼亚语的操作者不应听到英语数字。

源（source）有自己独立的流程：单独且明确的批准、一种清晰的开始和停止播放输入的方式，以及流式传输期间的可见指示。麦克风设备出厂时未配对访问处于关闭状态。要说明它需要先配对，用户才能批准它。

规范：[`server/hello`](/build/spec/#server--client-serverhello)、[源消息](/build/spec/#source-messages)。

<div class="callout callout--example">
<p class="callout__title">Music Assistant 是这样做的</p>

首次运行时，Music Assistant 列出它发现的 Sendspin 设备，让用户逐一批准或配对，并立即在第一台已批准的音箱上播放。

<figure>
<video controls preload="metadata" poster="/images/video-poster.svg" src="/videos/ma-onboarding.mp4"></video>
<figcaption>Music Assistant：首次运行引导，从空的设备列表到音乐响起。由端到端测试自动录制。</figcaption>
</figure>

与配对录像一样，这段录像也由[端到端测试](https://github.com/Sendspin/ma-pairing-e2e)在每次运行时生成。

</div>

## 维护

报告自身不可用的设备——例如电视切换到了 HDMI，或者输出被另一种协议接管——会被停放在它自己的一个已停止的分组中。应将其显示为“在别处使用中”而不是离线，并且当它恢复时不要把它拉回原来的分组；这一步由用户通过切换命令或在你的界面中完成。转到另一台服务器的设备显示为“正在由另一台服务器播放”，同样不是离线。离线只用于你完全无法连接的设备。

已配对、已批准和未知这几种状态在设置中也要保持可见，并在它们旁边提供取消配对和撤销操作，这样卖掉音箱的操作者就能在一个地方把它忘记。

规范：[外部源处理](/build/spec/#external-source-handling)。

## 需要设计的状态

- 未知设备：已发现，既未配对也未批准，带有批准和配对操作。
- 已批准设备：以未配对方式为你播放，可将配对作为升级，并提供撤销选项。
- 已配对设备：提供取消配对选项。
- 配对进行中：输入配对码；等待设备；配对码错误，请重试；设备暂时搁置尝试，并显示其消息。
- 凭据不匹配：警告和重新配对操作。
- 正在由另一台服务器播放。
- 在别处使用中（不可用），停放在它自己的分组中。
- 离线。

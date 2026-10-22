---
title: 设备上的配对
nav_title: Pairing
description: 客户端如何提供配对；如何为你的硬件选择方法、播报或显示代码、未配对访问的默认设置、配对记录、轮次与冷却时间、配对窗口，以及需要记录下来供测试的安全控制措施。
order: 21
---

配对是一次性的步骤，它把未配对的连接转变为双方都确切知道对方身份的连接。对播放而言，配对是可选的：音箱可以允许[未配对访问（unpaired access）](#unpaired-access-is-your-default-to-choose)——也就是用户熟知的访客模式（guest mode）——为操作者（operator）批准的任何服务器播放音乐。服务器要在未经身份验证的设备上激活音源（source）角色，必须先完成配对；也正是因为有了配对，服务器才能在设置阶段之后信任你的设备。本章介绍客户端一侧；[信任模型](/build/guide/pairing-and-encryption/)解释了这样设计的原因，[服务器 UX 章节](/build/guide/server/ux/)则介绍操作者会看到什么。

从用户的角度看，设备加入服务器的方式有三种：访客模式、设备显示或播报（或在你的应用中展示）的动态 PIN，以及印在设备上的静态 PIN。请勿将自动化配对列入这份清单。

## 为你的硬件选择代码方法

你只提供一种基于代码的方法，具体选择取决于设备能在何处显示或说出代码。

| 你的设备具备 | 应提供 |
|---|---|
| 显示屏 | 动态配对代码，以数字和二维码两种形式呈现 |
| 有扬声器但无显示屏 | 动态配对代码，以语音播报 |
| 自带应用 | 动态配对代码，在应用中显示；应用充当设备的显示屏 |
| 以上皆无 | 印在设备上的静态配对代码，需先通过按钮、针孔（pinhole）或断电重启模式（power-cycle pattern）开启配对窗口 |

绝不要同时列出两种代码方法，否则服务器将不得不询问操作者该使用哪一种，而操作者无从知晓。厂商应用可以算作显示屏：设备照常生成代码，由应用展示出来；这也涵盖了通过固件更新获得 Sendspin、标签上并未印有代码的设备。

规范：[方法（Methods）](/build/spec/#methods)、[配对方法描述符（pair-method descriptor）](/build/spec/#client--server-clienthello-pair-method-descriptor)。

## 配对 PSK 用于自动化场景

每个客户端还实现了配对 PSK（pre-shared key，预共享密钥）方法，用于系统之间的自动配对：例如 Home Assistant 将 ESPHome 设备的密钥交给 Music Assistant，使设备直接以已配对状态出现；厂商的云服务或应用为其管理的服务器做预配置；一台服务器代表另一台服务器注册设备。设备把该密钥以配对令牌（pairing token，文本或二维码，以 `SP:` 开头）的形式暴露给获准读取它的系统；用户永远不需要手动输入。请像对待 Wi-Fi 密码一样对待该令牌：仅供所有者自己的平台使用，绝不能印在访客可以拍摄到的地方。

规范：[PSK 配对流程（Pairing PSK Flow）](/build/spec/#pairing-psk-flow)、[配对令牌（Pairing Token）](/build/spec/#pairing-token)。

## 显示和播报代码

动态代码为六位数字，以 `123-456` 的形式呈现；静态代码为八位数字，以 `1234-5678` 的形式呈现。连字符仅用于展示。二维码以纯文本形式承载配对令牌，不包含 URI scheme，因此无论是扫码还是粘贴，提供给服务器的输入完全相同。

具备语音功能的设备自带数字音频。本项目目前既不提供也不托管语音包，但如果确有需求，将来可能会托管。请按照 RFC 4647 查找规则，从 `server/hello` 中的 `languages` 提示里选择语言；若没有任何匹配项，则回退到你自己的默认语言。数字之间保留较短的间隔，两组三位数字之间保留较长的间隔。代码在各轮之间保持不变，所以每轮开始时都要重新播报一遍；操作者可能第一次没有听到。

规范：[配对代码呈现（Pairing Code Presentation）](/build/spec/#pairing-code-presentation)、[配对令牌（Pairing Token）](/build/spec/#pairing-token)、[动态配对代码流程（Dynamic Pairing Code Flow）](/build/spec/#dynamic-pairing-code-flow)。

## 未配对访问的默认值由你决定

设备出厂时是否默认开启未配对访问由制造商决定。音箱通常出厂即开启，因为用户期望能在应用里选中这台设备就开始播放音乐。麦克风和其他涉及隐私的输入设备则出厂即关闭。无论你如何设置，音源角色始终需要服务器端的明确批准。更改该设置是在设备上或你的应用中进行的本地操作，服务器永远无法代为执行。用户启用该功能后，请在现有的所有未配对连接上发送带 `restart` 原因的 `client/goodbye`，这样下一个 `client/hello` 就能通告新值。

规范：[未配对访问（Unpaired Access）](/build/spec/#unpaired-access)。

## 配对记录

至少存储五条记录，每条记录包含一个长期 PSK 和该服务器的 `server_id`。当第六次配对到来时，逐出最近最少使用、且未支撑任何已打开连接的记录。你无需通知被逐出的服务器：它的下一次握手会引用一个你已不再持有的 PSK，并回退到 Sentinel 密钥，因此该服务器可以再次提议配对。

规范：[配对记录（Pairing Records）](/build/spec/#pairing-records)、[Sentinel 回退（Sentinel Fallback）](/build/spec/#sentinel-fallback)。

## 配对与播放并行运行

用于配对的 `server/activate` 不会影响你的角色、流或分组。只需暂停出通道（out-channel）：播报代码时将扬声器静音，显示代码时接管显示屏。流仍在继续运行，其时间轴不受影响，因此应丢弃尝试期间已调度的音频，并在尝试结束后同步恢复播放。为每次尝试设定约两分钟的超时（从其第一条消息算起），超时后使用 `attempt_timeout` 中止。

规范：[进入与退出配对（Entering and leaving pairing）](/build/spec/#entering-and-leaving-pairing)。

## 轮次、冷却与操作者操作

在动态流程中，一次尝试会针对同一个代码反复进行轮次（round），直到服务器的密钥确认验证通过。连续 20 轮失败后，你必须停止重试并暂缓后续尝试，直到设备上发生一次刻意的操作者操作；该操作同时也会重置计数。在达到该上限之前就应加入冷却（cooldown）时间。

<div class="callout callout--warn">
<p class="callout__title">从一开始就加入冷却时间</p>

设备最初可能允许来自任何已批准服务器的播放，之后在固件更新中又获得了涉及隐私的角色，例如麦克风。在更新之前就暴力破解过代码的攻击者，此时已持有一份与合法记录无从区分的配对记录。如果攻击者能够触发重置计数的那个操作，就不要只依赖 20 轮的上限。请加入一个随反复失败而递增的冷却时间，即便对于你今天发布的功能而言配对是可选的。

</div>

对于这类产品，操作者的操作必须是刻意的。对于硬接线、固定安装、不会有人意外拔掉电源的设备，断电重启可以算作有效操作。而对于接在带开关插座上的设备或便携式电池供电设备，断电重启则不算数，因为这类设备经常被断电重启，而且智能插座还能远程做到这一点。请改用断电重启模式、长按或设备 UI。当尝试被暂缓时，请通过 `client/pair-pending` 说明情况，附上一条简短的人性化消息，并使用服务器提示中的语言，以便服务器告知操作者该怎么做。

规范：[轮次（Rounds）](/build/spec/#rounds)、[`client/pair-pending`](/build/spec/#client--server-clientpair-pending)。

## 静态代码与配对窗口

静态代码是每台设备专属的随机八位数字，绝不使用共享的默认值，并印在标签上。每次尝试都要等待配对窗口开启，而窗口由一个刻意的动作开启：按下按钮、按下针孔、组合按键或断电重启模式。窗口持续约五分钟，并在五次失败尝试或一次完成的配对后提前关闭。等待该动作期间发送 `client/pair-pending`，窗口开启后发送 `client/pair-init`。

当窗口因失败而关闭时，不要点亮常亮的“锁定”LED。让锁定状态安静且可恢复：下一次动作即可开启新窗口。

规范：[静态配对代码流程（Static Pairing Code Flow）](/build/spec/#static-pairing-code-flow)、[配对窗口（Pairing Window）](/build/spec/#pairing-window)。

## 配对尝试结束时

服务器在离开配对之前的任何时刻，都可能以 `user_cancelled` 原因通过 `pair/abort` 中止。向用户展示尝试结束的原因——是他们在服务器端取消了操作、代码有误还是超时——并将出通道恢复为正常使用。被取消的尝试不会消耗配对窗口，且仅当代码已经开始播报或显示时才计入轮次上限。

规范：[`pair/abort`](/build/spec/#client--server-pairabort)。

## 安全与法规说明

未配对会话和静态代码会话仅在设置阶段暴露于中间人（man in the middle）攻击之下。配对完成后，之后的每个连接都由长期 PSK 和 Noise 握手完成身份验证。轮次上限和动作门控为测试实验室提供了可援引的规范章节，用于对应 ETSI EN 303 645 第 5.1-5 条以及 EN 18031-1 AUM-6；请在你的合规文件中引用[轮次（Rounds）](/build/spec/#rounds)和[配对窗口（Pairing Window）](/build/spec/#pairing-window)。

规范：[未配对访问（Unpaired Access）](/build/spec/#unpaired-access)、[加密（Encryption）](/build/spec/#encryption)。

<div class="callout callout--example">
<p class="callout__title">sendspin-cpp 是这样做的</p>

你声明 `pairing_code_out_channels` 和 `pairing_code_formats`，并实现 `on_display_pairing_code` 和 `on_clear_pairing_code` 来驱动你的显示屏或扬声器。对于静态流程，你设置 `static_pairing_code` 和 `pairing_window_supported`，在服务器请求时接收 `on_open_pairing_window`，并在用户做出动作时调用 `confirm_pairing_window`。出厂预置的 PSK 填入 `pairing_psk`，库会为代用户执行配对的平台生成 `SP:` 配对令牌。轮次计数器和冷却状态则通过你的持久化提供程序（persistence provider）保存。

</div>

---
title: Sendspin 实现指南
nav_title: Welcome
description: 将 Sendspin 构建到产品或应用中的手册；它面向哪些人、客户端和服务器分别是什么，以及从哪里开始。
order: 10
---

Sendspin 是一种开放协议，用于在家庭中的各个设备之间同步播放音乐：扬声器、功放、屏幕、灯光以及控制它们的各类应用。[协议规范](/build/spec/)精确定义了网络上传输的内容。本指南涵盖您需要的组件、用户体验，以及协议留给您自行决定的实现选择。

本指南不是规范性文件。当它重述某条规则时，规范才是权威，正文中会链接到相应规范。当它给出建议时，那些建议来自编写规范并交付了首批实现的人们。

## 定义

<div class="callout callout--note">

**客户端（client）**是从现有的 Sendspin 服务器接收音频的端点。以源（source）角色运行时，它还可以将自己的音频交给该服务器，由服务器分发给其他客户端。扬声器、功放、流媒体播放器（streamer）、显示屏和灯具都属于客户端。

**服务器（server）**向客户端发送音频并使它们保持同步。它还可以将源客户端的音频重新路由到其他客户端。服务器可以是手机或桌面上的应用，也可以是诸如 [Music Assistant](https://www.music-assistant.io) 这样的音乐服务器的一部分。

</div>

一台设备可以同时兼具两种角色。机顶盒既可作为客户端播放音乐，同时也可以作为服务器，将电视音频发送到房间里的扬声器。[概念章节](/build/guide/concepts/)解释了各组成部分是如何协同工作的。

## 选择您的实现路径

<div class="hub-cards">
  <div class="hub-card">
    <h3>您制造设备</h3>
    <p>对于扬声器、功放、流媒体播放器、显示屏和照明设备，请使用 C++ SDK 或 ESPHome 实现客户端部分。</p>
    <ul>
      <li><a href="/build/guide/use-cases/">在使用场景中找到您的产品</a></li>
      <li><a href="/build/guide/client/">逐步构建客户端</a></li>
      <li><a href="/build/guide/esphome/">使用 ESPHome 进行构建</a></li>
    </ul>
  </div>
  <div class="hub-card">
    <h3>您开发软件</h3>
    <p>音乐播放器、桌面或移动应用、流媒体桥接器，都可以作为客户端、服务器，或根据用户的操作在两者之间切换。</p>
    <ul>
      <li><a href="/build/guide/use-cases/">应用和软件播放器的使用场景</a></li>
      <li><a href="/build/guide/client/">客户端</a>和<a href="/build/guide/server/">服务器</a>的逐步构建指南</li>
      <li><a href="/build/sdks/">适用于 C++、Python 和 JavaScript 的 SDK</a></li>
    </ul>
  </div>
  <div class="hub-card">
    <h3>您运营平台</h3>
    <p>对于音乐服务器、家庭自动化中枢或多房间系统，请实现服务器部分以及用于配对和分组的接口。</p>
    <ul>
      <li><a href="/build/guide/server/">逐步构建服务器</a></li>
      <li><a href="/build/guide/server/ux/">用户对服务器的期望</a></li>
      <li><a href="/build/guide/pairing-and-encryption/">信任模型</a></li>
    </ul>
  </div>
</div>

## 协议的现状

Sendspin 1.0 目前处于候选发布版 1（Release Candidate 1）阶段。该协议已冻结：从现在到正式发布之前，只会合入澄清说明和修正，任何行为上的变更都会开启一个新的候选发布版。您今天基于 RC1 构建的内容将与 1.0 兼容。[贡献章节](/build/guide/contributing/)介绍了发布流程，规范自身的[治理文档](https://github.com/Sendspin/spec/blob/main/GOVERNANCE.md)则是权威参考。

实现该协议是免费的。无需支付任何许可使用费，且规范附带了来自每位贡献者的专利许可。Sendspin 的名称和徽标是商标，在产品上使用它们需要经过合作伙伴计划。[许可与商标](/licensing/)页面包含详细信息。

## 如何阅读本指南

- 前几章介绍术语和常见的产品设计。
- **构建客户端**和**构建服务器**按顺序逐步讲解各项工作，过程中会指出相关的规范和 SDK 钩子（hook）。请阅读与您要构建内容对应的部分，并浏览另一部分以了解对端。
- **安全**用通俗易懂的语言解释配对和加密，供需要对此进行审批的人员阅读。
- **发布上线**涵盖测试、认证以及如何参与该项目。

[在单页上阅读完整指南](/build/guide/all/)，或从该页面将其保存为 PDF。

## 获取帮助

实现方面的问题请到 [Music Assistant Discord](https://discord.gg/kaVm8hGpne) 的 `#sendspin-protocol` 频道提问。合作伙伴计划和认证相关的问题，请发送电子邮件至 [sendspin@openhomefoundation.org](mailto:sendspin@openhomefoundation.org)。规范本身的问题请提交到[规范仓库](https://github.com/Sendspin/spec/issues)。

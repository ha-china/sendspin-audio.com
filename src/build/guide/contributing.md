---
title: 贡献与治理
nav_title: Contributing
description: 谁在运营 Sendspin，草案（Draft）和已批准（Approved）对实现者意味着什么，规范仓库如何运作，如何提出变更或新角色，以及在哪里与项目交流。
section: Ship it
order: 51
---

Sendspin 在开放环境下开发，并接受实现者（implementor）的贡献。本章介绍如何提出变更，以及发布流程对您发布的代码意味着什么。权威文档位于[规范仓库](https://github.com/Sendspin/spec)。

## 治理与发布

Sendspin 是 [Open Home Foundation](https://www.openhomefoundation.org) 的一个项目。[GOVERNANCE.md](https://github.com/Sendspin/spec/blob/main/GOVERNANCE.md) 描述了谁来维护规范、变更如何获得批准以及发布如何进行；[SCOPE.md](https://github.com/Sendspin/spec/blob/main/SCOPE.md) 和[许可证](https://github.com/Sendspin/spec/blob/main/LICENSE.md)补全了全貌。

`main` 分支和候选发布版本（release candidate）属于草案（Draft）规范，而像 `1.0.0` 这样的正式版本则是携带完整专利承诺的已批准（Approved）规范。正式版本会至少提前 45 天公告，并且在最后一个候选发布版本与正式版本之间只会合并澄清性修改。

<div class="callout callout--note">
<p class="callout__title">RC1 对您意味着什么</p>

候选发布版本 1（Release Candidate 1）是一个冻结的协议。您今天基于它构建的内容将与 1.0 兼容，因为此时只允许进行澄清性修改。请关注仓库以获取最终标签（tag）；它为您和合作伙伴项目提供了一个固定的版本，可在文档和测试报告中引用。

</div>

## 规范仓库如何运作

已发布的 `README.md` 是自动生成的。其源文件为 `template.md`（文档头部、角色版本控制规则和组装顺序）、`connection.md`、`messaging.md`、`pairing.md`，以及 `roles/<role>/v1.md` 下每个角色版本对应的文件。编辑这些文件后使用 `python3 tools/build-readme.py` 重新构建；`--check` 用于验证生成的页面是否保持同步，这也是 CI 在每个 pull request（拉取请求）上运行的检查。每个克隆只需启用一次 pre-commit 钩子，这样您就永远不会提交过期的 `README.md`：

```sh
git config core.hooksPath .githooks
```

Pull request 模板中只有一个复选框：为该贡献接受[贡献者许可协议](https://github.com/Sendspin/spec/blob/main/CONTRIBUTOR-LICENSE-AGREEMENT.md)（Contributor License Agreement）。没有勾选的 pull request 不会被合并。该协议涵盖规范许可证、治理和贡献流程，并要求您确认您的雇主（如适用）也已同意。

[CONTRIBUTING.md](https://github.com/Sendspin/spec/blob/main/CONTRIBUTING.md) 列出了审阅者所适用的编辑规则。其中最常需要返工的几条是：

- **每个角色文件都是自包含的。** 适用于多个角色的文本会分别出现在每个文件中；这种重复是有意为之，这样实现某个客户端角色的人永远无需阅读其他角色文件。
- **常量字段放在 `client/hello` 中，可变字段放在 `client/state` 中。** hello 消息在每个连接中只发送一次，因此放在其中的任何内容只能通过重新连接来更新。
- **每个标题都需要一个唯一的锚点（anchor）**，如果链接指向不存在的锚点，构建将会失败。
- **每个术语只有一个规范名称**，取自定义（Definitions）部分，在正文中使用并与它所描述的传输标识符保持一致。
- **`**Note:**` 块是非规范性的。** 要求应写入正文；注释必须写成读者可以跳过的内容。

## 提出变更或新角色

本项目接受经过实践检验的变更。如果您想要新的消息、字段或角色，请先制作原型，通常是在 Music Assistant 和一个客户端中实现，并带着您的经验而来：您构建了什么、哪些可行、以及规范需要说明什么。没有实现支撑的提案会被讨论，但很少会被合并。

请使用[应用特定角色](/build/spec/#application-specific-roles)（application-specific roles），它们以下划线开头并带有明确的版本。将 `_wip_<role>@v1` 用于旨在成为规范一部分的草案，将 `_vendorname_<role>@v1` 用于特定于您产品的内容。服务器会忽略它们未实现的角色，因此草案角色可以随产品发布，并在开放环境中不断完善。

协议规则应放入规范中，实现建议应放入本指南中。读起来像教程的规范 pull request 会被要求移到这里，而开始定义行为的指南章节则会被要求改为指向规范。

讨论发生在两个地方。[Music Assistant Discord](https://discord.gg/kaVm8hGpne) 上的 `#sendspin-protocol` 频道面向开发者和实现者：提问、设计讨论以及任何尚未成为具体变更的内容。[规范仓库](https://github.com/Sendspin/spec/issues)中的 Issue 和 pull request 用于具体变更，而 pull request 上的讨论线程则保留给开发者讨论该变更。

## 面向实现者的角色版本控制

角色版本是协议在不破坏已发布内容的情况下增加功能的方式。请遵循[角色版本控制](/build/spec/#role-versioning)和[协议演进](/build/spec/#protocol-evolution)：

- **客户端会列出它支持的每个版本**，按优先级从高到低排列：`["player@v2", "player@v1"]`。服务器激活它实现的第一个版本，绝不会激活客户端未列出的版本。
- **服务器会实现其所声明规范中每个角色的每个版本**，并将对未知角色或版本的请求作为需要更新的信号加以跟踪。
- **未知字段和消息将被忽略。** 修订版本可以添加可选信息，前提是较旧的接收方可以忽略它而不改变消息的含义。只有当双方通过角色激活或声明的功能（capability）达成一致时，行为才会改变；软件版本匹配或没有返回错误并不算数。

如果您提出的变更破坏了现有角色的契约，它将成为新的角色版本。如果它改变了整个连接范围的行为，提案必须说明双方如何选择加入（opt in），以及当其中一方未加入时会发生什么。

## 为 SDK 和本指南做贡献

SDK、参考播放器和测试工具位于 [Sendspin GitHub 组织](https://github.com/Sendspin)中，每个都有自己的许可证和贡献说明。请在受影响实现的缺陷跟踪器（tracker）中报告 bug。如有可能，请附上[一致性测试套件](https://github.com/Sendspin/conformance)（conformance suite）中失败的场景以及清晰的描述。

本指南是[网站仓库](https://github.com/Sendspin/sendspin-audio.com)的一部分，位于 `src/build/guide/` 目录中，修复同样通过 pull request 的方式提交。如果规范回答了本指南未解答的问题，请在此提交澄清。

## 行为准则与联系方式

本项目遵循 Open Home Foundation 的[行为准则](https://github.com/Sendspin/spec/blob/main/CODE_OF_CONDUCT.md)，它适用于各个仓库、Discord 频道以及项目聚会的所有其他场所。如有疑虑请报告至 [safety@openhomefoundation.org](mailto:safety@openhomefoundation.org)。

有关商标、合作伙伴关系和认证的问题，请发送电子邮件至 [sendspin@openhomefoundation.org](mailto:sendspin@openhomefoundation.org)；[许可页面](/licensing/)涵盖了常见情况。对于所有技术问题，Discord 频道和规范仓库是最快的途径。

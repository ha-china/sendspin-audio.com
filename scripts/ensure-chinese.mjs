// Applies and re-applies the Simplified-Chinese chrome of the Sendspin
// mirror: the static templates and static data hold their English copy in
// the source, and the sync workflow takes the upstream side of every merge
// conflict (-X theirs), which resets this chrome on every sync. This script
// runs after the merge (idempotent) and puts the Chinese copy back.
//
// When an upstream edit changes the exact English text here, extend the
// mapping below with the new string; the script then keeps catching it.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const PAIRS = [
  // base.html
  ["Sendspin: Whole-home audio, without the lock-in.", "Sendspin：全屋音频，无需锁定。"],
  ['<html lang="en">', '<html lang="zh-CN">'],
  ['>Build</a>', '>构建</a>'],
  ['aria-label="Toggle menu"', 'aria-label="切换菜单"'],
  ['href="#whole-room">The experience</a>', 'href="#whole-room">体验</a>'],
  ['href="#live-demo">Live demo</a>', 'href="#live-demo">在线演示</a>'],
  ['manufacturers/">Why Sendspin</a>', 'manufacturers/">为什么选择 Sendspin</a>'],
  ['guide/">How to build</a>', 'guide/">如何构建</a>'],
  ['spec/">Spec</a>', 'spec/">规范</a>'],
  ['href="/build/">Build with Sendspin</a>', 'href="/build/">用 Sendspin 构建</a>'],
  ["The open standard for music in every room — from the Open Home Foundation.", "来自 Open Home Foundation 的跨房间音乐开放标准。"],
  ["This website uses", "本站使用"],
  ["to help us improve the site. You can view all data in our", "帮助我们改进网站。你可以在我们的"],
  ["public dashboard", "公开面板查看全部数据"],
  ["<h5>Listen</h5>", "<h5>听音乐</h5>"],
  ["<h5>Build</h5>", "<h5>构建</h5>"],
  ["<h5>Community</h5>", "<h5>社区</h5>"],
  ["Sendspin is at Release Candidate 1; the spec is being finalized.", "Sendspin 现为 Release Candidate 1，规范正在最终定稿。"],
  ["Licensing &amp; trademarks", "许可与商标"],
  ["Made warm in Switzerland.", "产自温暖的瑞士。"],

  // site.json footer labels
  ['"label": "The experience"', '"label": "体验"'],
  ['"label": "Live demo"', '"label": "在线演示"'],
  ['"label": "Get started"', '"label": "快速开始"'],
  ['"label": "Build with Sendspin"', '"label": "用 Sendspin 构建"'],
  ['"label": "For hardware makers"', '"label": "面向硬件厂商"'],
  ['"label": "Implementation guide"', '"label": "实施指南"'],
  ['"label": "SDKs & libraries"', '"label": "SDK 与库"'],
  ['"label": "Spec"', '"label": "规范"'],
  ['"label": "Contact"', '"label": "联系我们"'],

  // 404
  ["The page you were looking for could not be found.", "找不到你要访问的页面。"],
  ["<p>Sorry, we couldn't find the page you were looking for.</p>", "<p>抱歉，没有找到你要访问的页面。</p>"],
  ['href="/">Back to home</a>', 'href="/">返回首页</a>'],

  // guide.html
  ["<summary class=\"guide__drawer-summary\">Guide contents</summary>", "<summary class=\"guide__drawer-summary\">指南目录</summary>"],
  ["<p class=\"eyebrow guide__nav-section\">More</p>", "<p class=\"eyebrow guide__nav-section\">更多</p>"],
  ["href=\"/build/sdks/\">SDKs &amp; tools</a>", "href=\"/build/sdks/\">SDK 与工具</a>"],
  ["href=\"/build/spec/\">Spec</a>", "href=\"/build/spec/\">协议规范</a>"],
  ["href=\"/licensing/\">Licensing &amp; trademarks</a>", "href=\"/licensing/\">许可与商标</a>"],
  ["href=\"/build/guide/all/\">One page / PDF</a>", "href=\"/build/guide/all/\">单页 / PDF</a>"],
  ["aria-label=\"Implementation guide chapters\"", "aria-label=\"实施指南章节\""],
  ["aria-label=\"Previous and next chapter\"", "aria-label=\"上一章与下一章导航\""],
  [">Next</span>", ">下一章</span>"],
  [">Previous</span>", ">上一章</span>"],
  [">Protocol specification</a>", ">协议规范</a>"],

  // public/js/sendspin-demo-card.js
  ['"Open the Sendspin live demo in your browser."', '"在浏览器中打开 Sendspin 在线演示。"'],
  ['"Sendspin live demo"', '"Sendspin 在线演示"'],
  ['"Connecting..."', '"连接中…"'],
  ['"Stop listening"', '"停止收听"'],
  ['"Start listening"', '"开始收听"'],
  ['"Connection failed:"', '"连接失败："'],
  ['"Failed to disconnect player:"', '"断开播放器失败："'],
  ['"Failed to clean up after connection error:"', '"连接错误后清理失败："'],
  ['"Failed to share the live demo URL:"', '"分享演示链接失败："'],
  ['"Failed to trigger vibration:"', '"触发震动失败："'],
];

// index.html keeps a finer translation; see the section below.
for (const file of [
  "src/_includes/base.html",
  "src/_data/site.json",
  "src/404.html",
  "src/_includes/guide.html",
  "public/js/sendspin-demo-card.js",
]) {
  const path = root + file;
  let text = readFileSync(path, "utf8");
  const before = text;
  for (const [en, zh] of PAIRS) {
    text = text.split(en).join(zh);
  }
  if (text !== before) {
    writeFileSync(path, text);
    console.log(`chinese chrome applied to ${file}`);
  }
}
// Redoes the index.html marketing copy from the same source of truth as the
// zh-index pass, so a "-X theirs" sync that rewrites the hero cannot undo it.
const INDEX_PAIRS = [
  ["Release Candidate 1 · spec being finalized", "Release Candidate 1 · 规范最终定稿中"],
  ['<span class="l1">Whole-home audio,</span>', '<span class="l1">全屋音频，</span>'],
  ['<span class="l2">without the lock-in.</span>', '<span class="l2">无需依赖厂商。</span>'],
  ["Music, art and light in microsecond sync. An open standard from the", "微秒级同步的音乐、艺术与灯光。来自"],
  ["Try the live demo", "试试在线演示"],
  ["See how it works", "看看原理"],
  ['<span class="demo-card__now-label">Now playing</span>', '<span class="demo-card__now-label">正在播放</span>'],
  ['<span id="sendspin-demo-listen-toggle-label">Start listening</span>', '<span id="sendspin-demo-listen-toggle-label">开始收听</span>'],
  ['<span class="demo-card__sync-title">Synchronization</span>', '<span class="demo-card__sync-title">同步状态</span>'],
  ['aria-label="Synchronization graph"', 'aria-label="同步图"'],
  ['aria-label="Share the Sendspin live demo"', 'aria-label="分享 Sendspin 在线演示"'],
  ['<span class="demo-card__share-btn-label">Share</span>', '<span class="demo-card__share-btn-label">分享</span>'],
  ['<div class="partner-card__name">More coming</div>', '<div class="partner-card__name">更多即将加入</div>'],
  ["Works with Sendspin", "支持 Sendspin"],
  ["Become a partner", "成为合作伙伴"],
  ['href="/build/spec/">Read the spec</a>', 'href="/build/spec/">阅读规范</a>'],
  ['href="/build/sdks/">Browse the SDKs</a>', 'href="/build/sdks/">浏览 SDK</a>'],
];
{
  const path = root + "src/index.html";
  let text = readFileSync(path, "utf8");
  const isCRLF = text.includes("\r\n");
  const before = text;
  for (const [en0, zh0] of INDEX_PAIRS) {
    const en = isCRLF ? en0.split("\n").join("\r\n") : en0;
    const zh = isCRLF ? zh0.split("\n").join("\r\n") : zh0;
    text = text.split(en).join(zh);
  }
  if (text !== before) {
    writeFileSync(path, text);
    console.log("chinese chrome applied to src/index.html");
  }
}
// Re-adds the 51.la analytics snippet of the Chinese mirror, which the
// upstream base.html does not carry (idempotent: skips when present).
{
  const path = root + "src/_includes/base.html";
  let text = readFileSync(path, "utf8");
  const snippet =
    '    <script charset="UTF-8" id="LA_COLLECT" src="//sdk.51.la/js-sdk-pro.min.js?id=3MhQABjxy4RZQ6Ig&ck=3MhQABjxy4RZQ6Ig"></script>\n';
  if (!text.includes("sdk.51.la") && text.includes("</head>")) {
    text = text.replace("</head>", `${snippet}  </head>`);
    writeFileSync(path, text);
    console.log("51.la analytics re-applied");
  }
}
console.log("ensure-chinese done");

#!/usr/bin/env node
/**
 * Machine translation of Astro content for the "Chinese" mirror.
 *
 * Usage (in CI, via .github/workflows/sync-and-translate.yml, or locally):
 *   env FILE_LIST="path/to/file.md\nanother.mdx" node scripts/translate-upstream.mjs
 *
 * Env:
 *   TRANSLATION_API_KEY     API key of the OpenAI-compatible provider
 *   TRANSLATION_API_BASE    Base URL, e.g. https://api.openai.com/v1 or https://integrate.api.nvidia.com/v1
 *   TRANSLATION_MODEL       Model ID, e.g. gpt-4o-mini or z-ai/glm-5.3-flash
 *   TRANSLATION_CONCURRENCY Parallel requests (default 2)
 *   TRANSLATION_TIMEOUT_MS  Per-request timeout (default 600000)
 *   TRANSLATION_PROXY       Optional proxy for curl, e.g. socks5h://127.0.0.1:10808
 *
 * Transport is curl (present on GitHub runners and on Windows) because the
 * NVIDIA endpoint can take minutes before the first byte; curl's TCP
 * keepalive probes survive that silent wait, and a socks5 proxy is easy to
 * add when the direct route is unreliable.
 *
 * Rules:
 * - Prose is translated to Simplified Chinese; code, links, JSX, frontmatter structure are untouched.
 * - Files whose structure looks broken after translation are retried once, then skipped (kept English).
 */

import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";

// 智能处理 API URL，兼容多种配置方式
let API_BASE = process.env.LLM_API_URL || process.env.TRANSLATION_API_BASE || "https://api.siliconflow.cn/v1";
API_BASE = API_BASE.replace(/\/$/, ""); // 去掉末尾斜杠
if (API_BASE.endsWith("/chat/completions")) {
  API_BASE = API_BASE.slice(0, -"/chat/completions".length);
} else if (!API_BASE.endsWith("/v1")) {
  API_BASE = API_BASE + "/v1";
}
const API_KEY = process.env.LLM_API_KEY || process.env.TRANSLATION_API_KEY || "";
const MODEL = process.env.LLM_MODEL || process.env.TRANSLATION_MODEL || "gpt-4o-mini";
const PROXY = process.env.TRANSLATION_PROXY || "";
const CONCURRENCY = Number(process.env.TRANSLATION_CONCURRENCY || 2);
const REQUEST_TIMEOUT_MS = Number(process.env.TRANSLATION_TIMEOUT_MS || 900000);

if (!API_KEY) {
  console.error("TRANSLATION_API_KEY is not set");
  process.exit(1);
}

const files = (process.env.FILE_LIST || "")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

console.log(`${files.length} file(s) to translate${PROXY ? ` via ${PROXY}` : ""}`);

const SYSTEM_PROMPT = `You translate documentation pages from English into Simplified Chinese (zh-Hans) for the Home Assistant contributor website. You return ONLY the full translated file, never explanations and never a code fence around the output.

Strict rules:
1. Translate visible prose only: paragraphs, list items, table cells, heading text, blockquotes, and the "title" and "description" values in the frontmatter (between the opening --- and the closing ---).
2. Do NOT translate or alter anything else:
   - Fenced code blocks, including their language tag.
   - Inline code in single backticks.
   - URLs, link targets, anchor fragments [#...].
   - YAML frontmatter keys, and values other than title/description (slug, dates, tags, ids, file paths).
   - JSX/MDX component names and attributes, e.g. keep <AstroSomething prop="..."> exactly; you may translate the text between the opening and closing tags of components if it is prose.
3. Keep Markdown structure identical: same number and order of headings, lists, tables, images, and blank lines. Tables keep their column count.
4. Use the established Chinese translations of Home Assistant terms: "entity" 实体, "service" 服务, "state" 状态, "automation" 自动化, "device" 设备, "integration" 集成, "helper" 辅助元素, "blueprint" 蓝图, "dashboard" 仪表盘, "area" 区域, "zone" 地理位置区域. On first use of a term that may be ambiguous, add the English in parentheses, e.g. 实体（entity）.
5. Keep brands, product names, and file names in English: Home Assistant, ESPHome, Zigbee, YAML, Python, etc.
6. Keep backtick counts identical to the source. Never invent or drop content, never merge or split paragraphs.
7. Lines that consist solely of a placeholder token like ZZCODEBLOCK3ZZ stand for whole code blocks. Keep every such line exactly as is, on its own line, in the same position. Never translate, rename, merge, or drop a placeholder line.`;

// Replace fenced code blocks with single-line placeholders so the model can
// neither alter nor drop them. Restored verbatim after translation.
const CODE_PLACEHOLDER = (n) => `ZZCODEBLOCK${n}ZZ`;

function extractCodeBlocks(text) {
  const blocks = [];
  const source = text.replace(
    /^([`~]{3,})[^\n]*\n([\s\S]*?)^\1[^\n]*$/gm,
    (fence) => {
      blocks.push(fence);
      return CODE_PLACEHOLDER(blocks.length - 1);
    },
  );
  return { source, blocks };
}

function restoreCodeBlocks(text, blocks) {
  return text.replace(/^ZZCODEBLOCK(\d+)ZZ$/gm, (_, n) => {
    const block = blocks[Number(n)];
    return block ?? "";
  });
}

function countOf(text, re) {
  return (text.match(re) || []).length;
}

function structuralFingerprint(text) {
  return [
    countOf(text, /^```/gm) + countOf(text, /^~~~/gm),
    countOf(text, /`(?=[^\s`])|(?<=[^\s`])`/g) - countOf(text, /^[`~]{3,}/gm) * 2,
    countOf(text, /^#{1,6} /gm),
    countOf(text, /^[-*+] /gm),
    countOf(text, /^\|.*\|/gm),
    countOf(text, /<\/?[A-Z][A-Za-z0-9.]*[ />]/g),
  ];
}

const fingerprintsMatch = (a, b) =>
  a.every((value, i) => {
    // Small drift in list/bullet/table/inline-code counts is tolerated; the
    // code-fence, heading, and JSX counts must match exactly.
    if (i === 0 || i === 2 || i === 5) return value === b[i];
    return Math.abs(value - b[i]) <= 2;
  });

async function cleanup(path) {
  await unlink(path).catch(() => {});
}

async function chatCompletion(bodyObject) {
  const id = randomBytes(6).toString("hex");
  const requestFile = join(tmpdir(), `tr-req-${id}.json`);
  const responseFile = join(tmpdir(), `tr-res-${id}.json`);
  await writeFile(requestFile, JSON.stringify(bodyObject), "utf8");
  const args = [
    "-sS",
    "-N",
    "--max-time",
    String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
    "--keepalive-time",
    "25",
    ...(PROXY ? ["--proxy", PROXY] : []),
    `${API_BASE}/chat/completions`,
    "-H",
    `Authorization: Bearer ${API_KEY}`,
    "-H",
    "Content-Type: application/json",
    "-d",
    `@${requestFile}`,
    "-o",
    responseFile,
    "-w",
    "%{http_code}",
  ];
  let stdout;
  try {
    stdout = await new Promise((resolve, reject) => {
      execFile("curl", args, { timeout: REQUEST_TIMEOUT_MS + 15000, windowsHide: true, maxBuffer: 256 * 1024 * 1024 }, (error, out, errOut) => {
        if (error) reject(new Error((errOut || error.message).slice(0, 300)));
        else resolve(out.trim());
      });
    });
  } finally {
    await cleanup(requestFile);
  }
  const body = await readFile(responseFile, "utf8").catch(() => "");
  await cleanup(responseFile);
  if (stdout !== "200") {
    throw new Error(`HTTP ${stdout || "?"}: ${body.slice(0, 200)}`);
  }
  // Streaming responses arrive as SSE lines; accumulate the content deltas.
  // Some providers ignore "stream" and return a plain JSON body, so fall back.
  let text = "";
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") continue;
    try {
      const chunk = JSON.parse(payload);
      text += chunk.choices?.[0]?.delta?.content ?? "";
    } catch {}
  }
  if (!text.trim()) {
    try {
      const json = JSON.parse(body);
      text = json?.choices?.[0]?.message?.content ?? "";
    } catch {}
  }
  return text.trim();
}

async function translateOnce(path, userPrompt) {
  const reasoning = process.env.LLM_REASONING; // "none" | "low" | "high" | "max"
  const params = {
    model: MODEL,
    temperature: 0,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };
  // 硅基流动等端点用 enable_thinking；有些端点不支持关闭，只能用
  // reasoning_effort: low/high/max（此时省略 enable_thinking 参数）。
  if (!reasoning || reasoning === "none") {
    params.enable_thinking = false;
  } else {
    params.reasoning_effort = reasoning;
  }
  const data = await chatCompletion(params);
  let text = data;
  text = text.trim();
  if (/^```[^\n]*\n/.test(text)) text = text.replace(/^```[^\n]*\n/, "");
  if (/\n```$/.test(text)) text = text.replace(/\n```$/, "");
  if (!text) throw new Error("empty content from model");
  return text;
}

async function translateFile(path) {
  let original;
  try {
    original = await readFile(path, "utf8");
  } catch {
    return { path, status: "missing (deleted upstream?)" };
  }

  const fingerprint = structuralFingerprint(original);

  // Code blocks never reach the model: they leave as placeholders and are
  // restored verbatim, so they can neither drift nor vanish.
  const { source: protectedSource, blocks } = extractCodeBlocks(original);
  const parts = [
    `Translate this documentation page (${path}) into Simplified Chinese.`,
    "--- SOURCE ---",
    protectedSource,
  ];

  const attemptTranslate = async (extra) =>
    restoreCodeBlocks(
      await translateOnce(path, `${parts.join("\n")}${extra ? `\n--- ${extra}` : ""}`),
      blocks,
    );

  const RETRY_NOTE =
    "Your previous translation did not preserve the structure exactly: keep every heading, list, table, paragraph and inline code one-to-one with the source, translate only the prose, and never merge, split, add or drop elements.";

  let translated = await attemptTranslate();

  if (!fingerprintsMatch(structuralFingerprint(translated), fingerprint)) {
    console.error(
      `  fingerprint ${path}\n    source:      ${JSON.stringify(fingerprint)}\n    1st attempt: ${JSON.stringify(structuralFingerprint(translated))}`,
    );
    translated = await attemptTranslate(RETRY_NOTE);
    if (!fingerprintsMatch(structuralFingerprint(translated), fingerprint)) {
      console.error(
        `    2nd attempt: ${JSON.stringify(structuralFingerprint(translated))}`,
      );
      // Keep the English source: a partially wrong translation is worse than none.
      return { path, status: "skipped, structure mismatch" };
    }
  }

  await writeFile(path, `${translated.replace(/\s+$/, "")}\n`, "utf8");
  return { path, status: "translated" };
}

const failures = [];
let index = 0;

async function runner() {
  while (index < files.length) {
    const path = files[index++];
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const result = await translateFile(path);
        console.log(`${result.status}: ${result.path}`);
        break;
      } catch (error) {
        failures.push(`${path}: ${error.message}`);
        console.error(`${error.message} (attempt ${attempt}/5)`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 10000));
        if (attempt === 5) console.error(`Giving up on ${path}`);
      }
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length || 1) }, runner));

if (failures.length) {
  console.error(`\n${failures.length} request failure(s):`);
  for (const failure of failures.slice(0, 20)) console.error(`  ${failure}`);
}
console.log("done");

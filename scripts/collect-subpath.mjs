// Post-build step for the /sendspin/ sub-path deployment on
// www.hasscn.top. Eleventy has no "base" concept: pages reference assets at
// the root ("/style.css", "/build/spec/", url(/fonts/...)). Running the
// built site from hasscn.top/sendspin/ would 404 all of them.
//
// This script rewrites every root-relative reference in the built HTML,
// CSS, and JS to include the prefix, then moves the output into
// _site/sendspin/, so the folder contents can be uploaded 1:1 to the
// server's /sendspin/ directory. Idempotent: already-prefixed paths are
// left alone.
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PREFIX = process.env.SITE_BASE_PATH || "/sendspin";
const site = fileURLToPath(new URL("../dist/", import.meta.url));

const ATTR = /(href|src|poster|action)=("(?:\/[^"\/][^"]*")|'(?:\/[^'\/][^']*'))/g;
const CSS_URL = /url\(\s*("(?:\/[^"\/][^"]*)"|'(?:\/[^'\/][^']*)'|(?:\/[^)"'][^)]*'))\s*\)/g;
// JS string literals that start with a root path, in fetches and links:
// fetch("/x"), location.assign('/x'), "/images/..." concatenations.
const JS_PATH = /(?<![\w$.\/])(["'])\/(?!\/)[\w@][\w\-./@]*\1/g;

function prefix(value) {
  // value keeps its quotes: '"/style.css"' -> '"/sendspin/style.css"'.
  return `${value[0]}${PREFIX}${value.slice(1)}`;
}

let files = 0;
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(html|css|js|mjs|json|xml|txt|webmanifest)$/.test(name.name)) continue;
    let text = readFileSync(path, "utf8");
    const before = text;
    if (name.name.endsWith(".css")) {
      text = text.replace(CSS_URL, (m, q) => (q.slice(1).startsWith(PREFIX) ? m : `url(${prefix(q)})`));
    } else if (/\.m?js$/.test(name.name)) {
      text = text.replace(JS_PATH, (m, q) => (m.startsWith(`${q}${PREFIX}/`) ? m : `${q}${PREFIX}${m.slice(1)}`));
    } else {
      text = text
        .replace(/(href|src|poster|action)=("|')\/("|')/g, (m, attr, q) => `${attr}=${q}${PREFIX}/${q}`)
        .replace(ATTR, (m, attr, q) => (q.slice(1).startsWith(PREFIX) ? m : `${attr}=${prefix(q)}`))
        .replace(CSS_URL, (m, q) => (q.slice(1).startsWith(PREFIX) ? m : `url(${prefix(q)})`));
    }
    if (text !== before) {
      writeFileSync(path, text);
      files++;
    }
  }
}
walk(site);

// Collect into dist/sendspin/ so the folder uploads 1:1.
const base = PREFIX.replace(/^\//, "");
mkdirSync(join(site, base), { recursive: true });
for (const entry of readdirSync(site)) {
  if (entry === base) continue;
  renameSync(join(site, entry), join(site, base, entry));
}
console.log(`prefixed ${files} files, collected into dist/${base}/`);

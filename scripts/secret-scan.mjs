import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vinext",
  ".wrangler",
  "dist",
  "node_modules",
  "out",
  "submission-assets",
]);
const patterns = [
  { name: "OpenAI-style secret", expression: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "GitHub token", expression: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: "AWS access key", expression: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "private key block", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: "named API secret assignment",
    expression: /\b(?:OPENAI_API_KEY|CLOUDFLARE_API_TOKEN|CLOUDFLARE_API_KEY|CF_API_TOKEN|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|NPM_TOKEN)\s*[:=]\s*["']?[^\s"']{8,}/i,
  },
];

function files(directory) {
  const collected = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) collected.push(...files(absolute));
    else if (entry.isFile() && statSync(absolute).size <= 2_000_000) collected.push(absolute);
  }
  return collected;
}

const findings = [];
for (const absolute of files(root)) {
  const data = readFileSync(absolute);
  if (data.includes(0)) continue;
  const source = data.toString("utf8");
  for (const { name, expression } of patterns) {
    const match = expression.exec(source);
    if (!match) continue;
    const line = source.slice(0, match.index).split("\n").length;
    findings.push(`${relative(root, absolute)}:${line} (${name})`);
  }
}

if (findings.length) {
  console.error("High-confidence secret scan failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("High-confidence secret scan passed.");
}

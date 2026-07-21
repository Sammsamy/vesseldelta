import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clientRoot = join(root, "dist", "client");
const vinextCli = join(root, "node_modules", "vinext", "dist", "cli.js");
const port = 39000 + Math.floor(Math.random() * 10000);
const origin = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function publicPath(path) {
  return `/${relative(clientRoot, path).split(sep).map(encodeURIComponent).join("/")}`;
}

async function waitForServer(server, output) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`production server exited before readiness\n${output()}`);
    }
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(750) });
      if (response.ok) return response;
    } catch {
      // The process is still starting; retry until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`production server did not become ready within 12 seconds\n${output()}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

assert(existsSync(clientRoot), "dist/client is missing; run the production build first");
assert(existsSync(vinextCli), "vinext CLI is missing; install dependencies first");

const server = spawn(process.execPath, [vinextCli, "start"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

try {
  const rootResponse = await waitForServer(server, () => serverOutput);
  const html = await rootResponse.text();
  assert(html.includes("VesselDelta"), "production HTML is missing the product identity");
  assert(html.includes("2D LIVE FLOW MODEL"), "production HTML is missing the public model identity");
  assert(html.includes("45-second tour"), "production HTML is missing the default guided experience");
  assert(html.includes("Wall stress and strength"), "production HTML is missing the wall mechanics experiment");

  const files = walk(clientRoot).filter((path) => {
    const name = relative(clientRoot, path);
    return !name.startsWith(".vite/") && name !== ".assetsignore" && name !== "_headers" && statSync(path).size > 0;
  });
  assert(files.some((path) => /vessel-theatre-3d-[^/]+\.js$/.test(path)), "lazy 3D theatre chunk is missing from the client bundle");

  let fetchedBytes = 0;
  for (const file of files) {
    const path = publicPath(file);
    const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(2_000) });
    assert(response.status === 200, `${path} returned HTTP ${response.status}`);
    const body = await response.arrayBuffer();
    assert(body.byteLength === statSync(file).size, `${path} served ${body.byteLength} bytes; expected ${statSync(file).size}`);
    fetchedBytes += body.byteLength;
  }

  console.log(`Production smoke passed: HTML plus ${files.length} public files (${fetchedBytes.toLocaleString()} bytes), including the lazy 3D theatre chunk.`);
} finally {
  await stopServer(server);
}

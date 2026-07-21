import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the VesselDelta instrument shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>VesselDelta — Change a vessel\. See what pressure and flow do\.<\/title>/i);
  assert.match(html, /Change a vessel/);
  assert.match(html, /Live vessel experiment/);
  assert.match(html, /2D LIVE FLOW MODEL/);
  assert.match(html, /3D VIEW/);
  assert.match(html, /45-second tour/);
  assert.match(html, /Try it yourself/);
  assert.match(html, /How common medicine classes work/);
  assert.match(html, /Four real questions/);
  assert.match(html, /What happens when plaque narrows the passage/);
  assert.match(html, /How can diet, activity, and medicines change pressure/);
  assert.match(html, /WHY HIGH BLOOD PRESSURE MATTERS/);
  assert.match(html, /119\.9 million/);
  assert.match(html, /MAKE A GUESS, THEN TEST IT/);
  assert.match(html, /Wall stress and strength/i);
  assert.match(html, /No physician review, educator study, or clinical validation was completed/);
  assert.match(html, /EDUCATIONAL/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

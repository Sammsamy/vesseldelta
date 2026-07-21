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
  assert.match(html, /<title>VesselDelta — Live blood-flow instrument<\/title>/i);
  assert.match(html, /Shape the vessel/);
  assert.match(html, /Live hemodynamics instrument/);
  assert.match(html, /2D D2Q9 CFD/);
  assert.match(html, /3D cutaway/);
  assert.match(html, /Guided lab/);
  assert.match(html, /Free explore/);
  assert.match(html, /Treatment mechanism theatre/);
  assert.match(html, /OPTIONAL CLINICAL CONTEXT/);
  assert.match(html, /119\.9 million/);
  assert.match(html, /PREDICT BEFORE REVEAL/);
  assert.match(html, /No physician review, educator study, or clinical validation was completed/);
  assert.match(html, /Illustrative/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

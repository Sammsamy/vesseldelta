import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const requiredGalleryNames = [
  "00-cover-1280x720.jpg",
  "01-guided-gated-reveal-1280x720.jpg",
  "02-pressure-separation-1280x720.jpg",
  "03-rupture-boundary.jpg",
  "04-live-verification-1280x720.jpg",
];

function marker(code, payload) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, code]), length, payload]);
}

// Minimal baseline grayscale JPEG: one zero-DC/EOB block for every 8x8 MCU.
// A distinct COM marker keeps fixture files byte-distinct without changing pixels.
function jpeg(width, height, label) {
  const quantization = Buffer.concat([Buffer.from([0]), Buffer.alloc(64, 1)]);
  const frame = Buffer.alloc(9);
  frame[0] = 8;
  frame.writeUInt16BE(height, 1);
  frame.writeUInt16BE(width, 3);
  frame.set([1, 1, 0x11, 0], 5);

  const codeCounts = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const dcTable = Buffer.concat([Buffer.from([0x00]), codeCounts, Buffer.from([0x00])]);
  const acTable = Buffer.concat([Buffer.from([0x10]), codeCounts, Buffer.from([0x00])]);
  const scan = Buffer.from([1, 1, 0, 0, 63, 0]);

  const blockCount = Math.ceil(width / 8) * Math.ceil(height / 8);
  const entropy = Buffer.alloc(Math.ceil((blockCount * 2) / 8));
  const remainingBits = (blockCount * 2) % 8;
  if (remainingBits !== 0) entropy[entropy.length - 1] = (1 << (8 - remainingBits)) - 1;

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    marker(0xfe, Buffer.from(label, "utf8")),
    marker(0xdb, quantization),
    marker(0xc0, frame),
    marker(0xc4, dcTable),
    marker(0xc4, acTable),
    marker(0xda, scan),
    entropy,
    Buffer.from([0xff, 0xd9]),
  ]);
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "vesseldelta-release-audit-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "submission-assets"));
  copyFileSync(join(projectRoot, "scripts/release-audit.mjs"), join(root, "scripts/release-audit.mjs"));

  writeFileSync(
    join(root, "README.md"),
    [
      "## Codex + GPT-5.6 collaboration",
      "No physician review, educator study, or clinical validation was completed.",
      "This is not clinical CFD and cannot predict rupture.",
    ].join("\n"),
  );
  writeFileSync(join(root, "SUBMISSION_DRAFT.md"), "**Primary track:** Education\n**Team:** Individual\n");
  writeFileSync(
    join(root, "VIDEO_SCRIPT.md"),
    [
      "Target: **2 minutes 30 seconds**",
      "Use a real voiceover.",
      "> Codex and GPT-5.6 implemented D2Q9 boundaries and audited extreme-flow control in the 3D view with a 2D source.",
    ].join("\n"),
  );

  for (const [index, name] of requiredGalleryNames.entries()) {
    writeFileSync(join(root, "submission-assets", name), jpeg(1280, 720, `gallery-${index}`));
  }
  writeFileSync(
    join(root, "submission-assets", "thumbnail-1200x800.jpg"),
    jpeg(1200, 800, "thumbnail"),
  );
  return root;
}

function audit(root) {
  const result = spawnSync(process.execPath, ["scripts/release-audit.mjs", "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.signal, null, result.stderr);
  assert.notEqual(result.stdout, "", `audit produced no JSON\n${result.stderr}`);
  return { processStatus: result.status, report: JSON.parse(result.stdout) };
}

function galleryCheck(report) {
  const check = report.checks.find(({ id }) => id === "gallery");
  assert.ok(check, "gallery check must be present");
  return check;
}

function withFixture(run) {
  const root = createFixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("release gallery audit accepts the exact valid asset set", () => {
  withFixture((root) => {
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 0);
    assert.equal(galleryCheck(report).status, "PASS");
    assert.match(galleryCheck(report).detail, /exactly five 1280x720 gallery JPEGs plus one 1200x800 thumbnail/i);
  });
});

test("release gallery audit rejects a missing cover", () => {
  withFixture((root) => {
    unlinkSync(join(root, "submission-assets", requiredGalleryNames[0]));
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(galleryCheck(report).detail, /4\/5 gallery images/);
    assert.match(galleryCheck(report).detail, /00-cover-1280x720\.jpg must be a real 1280x720 JPEG/);
  });
});

test("release gallery audit rejects a renamed cover", () => {
  withFixture((root) => {
    renameSync(
      join(root, "submission-assets", requiredGalleryNames[0]),
      join(root, "submission-assets", "00-cover-renamed-1280x720.jpg"),
    );
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(galleryCheck(report).detail, /gallery filenames must exactly match/);
    assert.match(galleryCheck(report).detail, /00-cover-1280x720\.jpg must be a real 1280x720 JPEG/);
  });
});

test("release gallery audit rejects an extension and content mismatch", () => {
  withFixture((root) => {
    const original = join(root, "submission-assets", requiredGalleryNames[1]);
    const mismatched = join(root, "submission-assets", "01-guided-gated-reveal-1280x720.png");
    renameSync(original, mismatched);
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(galleryCheck(report).detail, /invalid or extension-mismatched: 01-guided-gated-reveal-1280x720\.png/);
  });
});

test("release gallery audit rejects a sixth gallery image", () => {
  withFixture((root) => {
    writeFileSync(join(root, "submission-assets", "05-extra-1280x720.jpg"), jpeg(1280, 720, "extra"));
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(galleryCheck(report).detail, /6\/5 gallery images \(exactly five required\)/);
  });
});

test("release gallery audit rejects a truncated JPEG", () => {
  withFixture((root) => {
    const path = join(root, "submission-assets", requiredGalleryNames[2]);
    const complete = readFileSync(path);
    writeFileSync(path, complete.subarray(0, complete.length - 2));
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(galleryCheck(report).detail, /invalid or extension-mismatched: 02-pressure-separation-1280x720\.jpg/);
  });
});

test("release gallery audit rejects duplicate image content", () => {
  withFixture((root) => {
    copyFileSync(
      join(root, "submission-assets", requiredGalleryNames[0]),
      join(root, "submission-assets", requiredGalleryNames[1]),
    );
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(galleryCheck(report).detail, /gallery and thumbnail files must have distinct image content/);
  });
});

test("release gallery audit rejects wrong non-cover dimensions", () => {
  withFixture((root) => {
    writeFileSync(
      join(root, "submission-assets", requiredGalleryNames[3]),
      jpeg(1279, 720, "wrong-width"),
    );
    const { processStatus, report } = audit(root);
    assert.equal(processStatus, 1);
    assert.equal(galleryCheck(report).status, "FAIL");
    assert.match(
      galleryCheck(report).detail,
      /every gallery image must be a real 1280x720 JPEG: 03-rupture-boundary\.jpg/,
    );
  });
});

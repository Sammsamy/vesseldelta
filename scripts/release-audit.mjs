import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const strict = process.argv.includes("--strict");
const jsonOnly = process.argv.includes("--json");
const receiptPath = join(root, "release-evidence.json");
const judgingAvailabilityDeadline = Date.parse("2026-08-05T17:00:00-07:00");

const STATUS = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  PENDING_OWNER: "PENDING_OWNER",
  PENDING_EXTERNAL: "PENDING_EXTERNAL",
  WARN: "WARN",
  SKIP: "SKIP",
});

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "nullable-number") return value === null || (typeof value === "number" && Number.isFinite(value));
  if (type === "nullable-boolean") return value === null || typeof value === "boolean";
  return typeof value === type;
}

function validateReceiptShape(receipt) {
  if (!isObject(receipt)) return "root must be a JSON object";
  if (receipt.schemaVersion !== 1) return "schemaVersion must equal 1";

  const sections = {
    artifact: { commit: "string" },
    license: { approvedByOwner: "boolean", spdx: "string", file: "string", sha256: "string" },
    repository: { approvedByOwner: "boolean", url: "string", visibility: "string", privateSharedWith: "array" },
    deployment: {
      approvedByOwner: "boolean",
      url: "string",
      commit: "string",
      publicNoLogin: "boolean",
      verifiedAt: "string",
      availableThrough: "string",
    },
    video: {
      approvedByOwner: "boolean",
      url: "string",
      public: "boolean",
      durationSeconds: "nullable-number",
      realHumanVoice: "boolean",
      codexAndGpt56UseSpoken: "boolean",
      verifiedAt: "string",
    },
    codex: { primarySessionId: "string" },
    qa: {
      deploymentUrl: "string",
      verifiedAt: "string",
      desktopBrowsers: "array",
      mobileViewports: "array",
      consoleErrorFree: "nullable-boolean",
      webglFallbackVerified: "boolean",
      reducedMotionVerified: "boolean",
      galleryCompared: "boolean",
    },
    devpost: {
      track: "string",
      team: "string",
      country: "string",
      termsAccepted: "boolean",
      finalSubmissionApproved: "boolean",
      finalSubmissionApprovedAt: "string",
    },
  };

  for (const [section, fields] of Object.entries(sections)) {
    if (!isObject(receipt[section])) return `${section} must be an object`;
    for (const [field, type] of Object.entries(fields)) {
      if (!Object.hasOwn(receipt[section], field)) return `${section}.${field} is required`;
      if (!hasType(receipt[section][field], type)) return `${section}.${field} must be ${type}`;
    }
  }

  for (const [field, values] of [
    ["repository.privateSharedWith", receipt.repository.privateSharedWith],
    ["qa.desktopBrowsers", receipt.qa.desktopBrowsers],
    ["qa.mobileViewports", receipt.qa.mobileViewports],
  ]) {
    if (!values.every((value) => typeof value === "string")) return `${field} must contain only strings`;
  }

  return null;
}

function loadReceipt() {
  if (!existsSync(receiptPath)) return { present: false, value: null, error: null };
  try {
    const value = JSON.parse(readFileSync(receiptPath, "utf8"));
    return { present: true, value, error: validateReceiptShape(value) };
  } catch (error) {
    return { present: true, value: null, error: `invalid JSON: ${error.message}` };
  }
}

function imageMetadata(relativePath) {
  const data = readFileSync(join(root, relativePath));
  const extension = extname(relativePath).slice(1).toLowerCase();

  if (
    data.length >= 24
    && data.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
    && data.subarray(12, 16).toString("ascii") === "IHDR"
  ) {
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    const complete = data.length >= 12 && data.subarray(data.length - 12).toString("hex") === "0000000049454e44ae426082";
    return { extension, format: "png", width, height, bytes: data.length, complete };
  }

  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (offset < data.length && data[offset] === 0xff) offset += 1;
      if (offset >= data.length) break;
      const marker = data[offset];
      offset += 1;

      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > data.length) break;

      const segmentLength = data.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > data.length) break;
      const isStartOfFrame = [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
        0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
      ].includes(marker);
      if (isStartOfFrame && segmentLength >= 7) {
        return {
          extension,
          format: "jpeg",
          width: data.readUInt16BE(offset + 5),
          height: data.readUInt16BE(offset + 3),
          bytes: data.length,
          complete: data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9,
        };
      }
      offset += segmentLength;
    }
  }

  return { extension, format: "unknown", width: 0, height: 0, bytes: data.length, complete: false };
}

function extensionMatchesFormat(metadata) {
  if (metadata.format === "png") return metadata.extension === "png";
  if (metadata.format === "jpeg") return metadata.extension === "jpg" || metadata.extension === "jpeg";
  return false;
}

function isCommit(value) {
  return /^[0-9a-f]{40}$/i.test(value);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost = host === "localhost"
      || host.endsWith(".local")
      || /^127\./.test(host)
      || /^10\./.test(host)
      || /^192\.168\./.test(host)
      || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host)
      || host === "0.0.0.0"
      || host === "::1";
    return url.protocol === "https:" && !privateHost && Boolean(host);
  } catch {
    return false;
  }
}

function isYouTubeUrl(value) {
  if (!isPublicHttpsUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  return host === "youtube.com" || host === "youtu.be";
}

function normalizeRepositoryUrl(value) {
  if (!value) return "";
  let normalized = value.trim();
  const sshMatch = normalized.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) normalized = `${sshMatch[1]}/${sshMatch[2]}`;
  else {
    try {
      const url = new URL(normalized);
      normalized = `${url.hostname}${url.pathname}`;
    } catch {
      normalized = normalized.replace(/^[a-z]+:\/\//i, "");
    }
  }
  return normalized.replace(/^www\./, "").replace(/\.git$/i, "").replace(/\/+$/, "").toLowerCase();
}

function licenseFilePath(relativePath) {
  if (!relativePath || basename(relativePath) !== relativePath || !/^licen[cs]e(?:\.[\w.-]+)?$/i.test(relativePath)) return null;
  const absolute = resolve(root, relativePath);
  if (dirname(absolute) !== root || !existsSync(absolute) || !statSync(absolute).isFile()) return null;
  return absolute;
}

function isSpdxIdentifier(value) {
  return /^[A-Za-z0-9][A-Za-z0-9.+-]*(?:-(?:only|or-later))?$/.test(value);
}

function check(id, group, status, detail, required = true) {
  return { id, group, required, status, detail };
}

const receipt = loadReceipt();

if (receipt.error) {
  const malformed = {
    status: "malformed-release-evidence",
    fullyReady: false,
    strict,
    exitCode: 3,
    receipt: { present: true, path: "release-evidence.json", error: receipt.error },
    checks: [],
  };
  if (jsonOnly) console.log(JSON.stringify(malformed, null, 2));
  else {
    console.error("VesselDelta release audit");
    console.error(`FAIL  [receipt] release_evidence: ${receipt.error}`);
    console.error("release-evidence.json is malformed; copy the template and preserve its field types.");
  }
  process.exitCode = 3;
} else {
  const readme = read("README.md");
  const submission = read("SUBMISSION_DRAFT.md");
  const video = read("VIDEO_SCRIPT.md");
  const spokenVideo = video
    .split("\n")
    .filter((line) => /^\s*>/.test(line))
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join(" ");
  const assetDirectory = join(root, "submission-assets");
  const assetNames = existsSync(assetDirectory)
    ? readdirSync(assetDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort()
    : [];
  const imageRecords = assetNames.map((name) => ({
    name,
    ...imageMetadata(`submission-assets/${name}`),
    digest: sha256(join(assetDirectory, name)),
  }));
  const invalidImages = imageRecords.filter((image) => !extensionMatchesFormat(image) || !image.complete || image.width <= 0 || image.height <= 0);
  const cover = imageRecords.find((image) => image.name === "00-cover-1280x720.jpg");
  const thumbnail = imageRecords.find((image) => image.name === "thumbnail-1200x800.jpg");
  const galleryImages = imageRecords.filter((image) => image.name !== "thumbnail-1200x800.jpg");
  const galleryCount = galleryImages.length;
  const requiredGalleryNames = [
    "00-cover-1280x720.jpg",
    "01-guided-gated-reveal-1280x720.jpg",
    "02-pressure-separation-1280x720.jpg",
    "03-rupture-boundary.jpg",
    "04-live-verification-1280x720.jpg",
  ];
  const galleryNamesReady = galleryImages.map((image) => image.name).sort().join("\n") === requiredGalleryNames.join("\n");
  const imageDigestsAreDistinct = new Set(imageRecords.map((image) => image.digest)).size === imageRecords.length;
  const head = git(["rev-parse", "HEAD"]);
  const origin = git(["remote", "get-url", "origin"]);
  const worktree = git(["status", "--porcelain"]);
  const evidence = receipt.value;
  const checks = [];

  const galleryReady = galleryCount === 5
    && galleryNamesReady
    && imageDigestsAreDistinct
    && invalidImages.length === 0
    && galleryImages.every((image) => image.format === "jpeg" && image.width === 1280 && image.height === 720)
    && cover?.format === "jpeg" && cover.width === 1280 && cover.height === 720
    && thumbnail?.format === "jpeg" && thumbnail.width === 1200 && thumbnail.height === 800;
  const galleryProblems = [];
  if (galleryCount !== 5) galleryProblems.push(`${galleryCount}/5 gallery images (exactly five required)`);
  if (!galleryNamesReady) galleryProblems.push(`gallery filenames must exactly match: ${requiredGalleryNames.join(", ")}`);
  if (!imageDigestsAreDistinct) galleryProblems.push("gallery and thumbnail files must have distinct image content");
  const invalidGalleryImages = galleryImages.filter((image) => image.format !== "jpeg" || image.width !== 1280 || image.height !== 720);
  if (invalidGalleryImages.length) galleryProblems.push(`every gallery image must be a real 1280x720 JPEG: ${invalidGalleryImages.map((image) => image.name).join(", ")}`);
  if (!cover || cover.width !== 1280 || cover.height !== 720 || cover.format !== "jpeg") galleryProblems.push("00-cover-1280x720.jpg must be a real 1280x720 JPEG");
  if (!thumbnail || thumbnail.width !== 1200 || thumbnail.height !== 800 || thumbnail.format !== "jpeg") galleryProblems.push("thumbnail must be a real 1200x800 JPEG");
  if (invalidImages.length) galleryProblems.push(`invalid or extension-mismatched: ${invalidImages.map((image) => image.name).join(", ")}`);
  checks.push(check(
    "gallery",
    "local",
    galleryReady ? STATUS.PASS : STATUS.FAIL,
    galleryReady ? "exactly five 1280x720 gallery JPEGs plus one 1200x800 thumbnail verified" : galleryProblems.join("; "),
  ));

  checks.push(check(
    "submission_identity",
    "local",
    /\*\*Primary track:\*\* Education/i.test(submission) && /\*\*Team:\*\* Individual/i.test(submission)
      ? STATUS.PASS
      : STATUS.FAIL,
    "draft names the Education track and an individual entry",
  ));

  const concreteCodexTerms = [
    /D2Q9/i,
    /boundar(?:y|ies)/i,
    /extreme-flow control/i,
    /tight-lumen test/i,
    /live gate/i,
    /(?:3D view.*2D source|2D source inside 3D)/i,
    /medical claim/i,
  ].filter((pattern) => pattern.test(spokenVideo)).length;
  const codexAndGptMentioned = /\bCodex\b[^.]{0,80}\bGPT-5\.6\b/i.test(spokenVideo)
    || /\bGPT-5\.6\b[^.]{0,80}\bCodex\b/i.test(spokenVideo);
  const codexStoryReady = /## Codex \+ GPT-5\.6 collaboration/i.test(readme)
    && codexAndGptMentioned
    && /\b(?:used|helped|implemented|stress-tested|caught|forced|narrowed|audited)\b/i.test(spokenVideo)
    && concreteCodexTerms >= 2;
  checks.push(check(
    "codex_story",
    "local",
    codexStoryReady ? STATUS.PASS : STATUS.FAIL,
    codexStoryReady
      ? `README build story plus spoken Codex/GPT-5.6 segment with ${concreteCodexTerms} concrete project decisions`
      : "spoken script must say what Codex/GPT-5.6 concretely implemented, caught, or changed",
  ));

  const medicalBoundaryReady = /No physician review, educator study, or clinical validation/i.test(readme)
    && /not clinical CFD/i.test(readme)
    && /(?:cannot (?:show|predict).*rupture|does not compute rupture)/i.test(readme);
  checks.push(check(
    "medical_boundary",
    "local",
    medicalBoundaryReady ? STATUS.PASS : STATUS.FAIL,
    "review status, non-clinical scope, and rupture boundary",
  ));

  const target = video.match(/Target:\s*\*\*(\d+) minutes?\s+(\d+) seconds?\*\*/i);
  const targetSeconds = target ? Number(target[1]) * 60 + Number(target[2]) : NaN;
  const videoScriptReady = Number.isFinite(targetSeconds)
    && targetSeconds > 0
    && targetSeconds < 180
    && /real voiceover/i.test(video);
  checks.push(check(
    "video_script",
    "local",
    videoScriptReady ? STATUS.PASS : STATUS.FAIL,
    videoScriptReady ? `${targetSeconds}-second plan with real voiceover` : "target must parse below 180 seconds and require real voiceover",
  ));

  checks.push(check(
    "worktree_clean",
    "local",
    worktree === "" ? STATUS.PASS : (strict ? STATUS.FAIL : STATUS.WARN),
    worktree === "" ? "clean" : `${worktree.split("\n").length} uncommitted path(s)${strict ? "; strict mode requires a clean tree" : ""}`,
  ));

  checks.push(check(
    "release_evidence",
    "receipt",
    receipt.present ? STATUS.PASS : STATUS.SKIP,
    receipt.present
      ? "typed release-evidence.json loaded; individual claims are checked below"
      : "no release-evidence.json; template is not evidence and release gates remain pending",
    false,
  ));

  if (!evidence || !evidence.artifact.commit) {
    checks.push(check("release_commit", "release", STATUS.PENDING_EXTERNAL, "final release commit has not been recorded"));
  } else if (!isCommit(evidence.artifact.commit) || evidence.artifact.commit !== head) {
    checks.push(check("release_commit", "release", STATUS.FAIL, "recorded commit must be the current full 40-character HEAD"));
  } else {
    checks.push(check("release_commit", "release", STATUS.PASS, evidence.artifact.commit));
  }

  const privateRepositoryRoute = evidence?.repository.approvedByOwner
    && evidence.repository.visibility.toLowerCase() === "private";
  if (privateRepositoryRoute) {
    checks.push(check(
      "license",
      "release",
      STATUS.PASS,
      "private repository route selected; contest access is checked through both required judge shares",
    ));
  } else if (!evidence?.license.approvedByOwner) {
    checks.push(check(
      "license",
      "owner",
      STATUS.PENDING_OWNER,
      "public release requires VesselDelta-specific license approval; an authorized private shared route is the alternative",
    ));
  } else if (!evidence.license.spdx || !evidence.license.file || !evidence.license.sha256) {
    checks.push(check("license", "release", STATUS.PENDING_EXTERNAL, "approved license file, SPDX identifier, and SHA-256 are not all recorded"));
  } else {
    const file = licenseFilePath(evidence.license.file);
    const validSpdx = isSpdxIdentifier(evidence.license.spdx);
    const validHash = /^[0-9a-f]{64}$/i.test(evidence.license.sha256);
    const matchingHash = file && validHash && sha256(file) === evidence.license.sha256.toLowerCase();
    checks.push(check(
      "license",
      "release",
      file && validSpdx && matchingHash ? STATUS.PASS : STATUS.FAIL,
      file && validSpdx && matchingHash
        ? `${evidence.license.spdx}; ${evidence.license.file} hash verified`
        : "license receipt has an invalid SPDX identifier, root file, or SHA-256 mismatch",
    ));
  }

  if (!evidence?.repository.approvedByOwner) {
    checks.push(check("repository", "owner", STATUS.PENDING_OWNER, "repository publication/sharing approval is not recorded"));
  } else if (!evidence.repository.url || !evidence.repository.visibility || !origin) {
    checks.push(check("repository", "release", STATUS.PENDING_EXTERNAL, "approved repository URL, visibility, and local origin are not all present"));
  } else {
    const visibility = evidence.repository.visibility.toLowerCase();
    const shares = new Set(evidence.repository.privateSharedWith.map((value) => value.trim().toLowerCase()));
    const privateSharesReady = visibility !== "private"
      || (shares.has("testing@devpost.com") && shares.has("build-week-event@openai.com"));
    const validRepository = isPublicHttpsUrl(evidence.repository.url)
      && ["public", "private"].includes(visibility)
      && privateSharesReady
      && normalizeRepositoryUrl(evidence.repository.url) === normalizeRepositoryUrl(origin);
    checks.push(check(
      "repository",
      "release",
      validRepository ? STATUS.PASS : STATUS.FAIL,
      validRepository
        ? `${visibility} remote matches origin${visibility === "private" ? "; both judge accounts recorded" : ""}`
        : "repository URL/origin mismatch, invalid visibility, or required private-repo judge shares are missing",
    ));
  }

  if (!evidence?.deployment.approvedByOwner) {
    checks.push(check("public_demo", "owner", STATUS.PENDING_OWNER, "deployment approval is not recorded"));
  } else {
    const missingDeployment = !evidence.deployment.url
      || !evidence.deployment.commit
      || !evidence.deployment.verifiedAt
      || !evidence.deployment.availableThrough
      || !evidence.deployment.publicNoLogin;
    if (missingDeployment) {
      checks.push(check("public_demo", "release", STATUS.PENDING_EXTERNAL, "approved public no-login deployment still needs a URL, commit, verification time, and availability pledge"));
    } else {
      const validDeployment = isPublicHttpsUrl(evidence.deployment.url)
        && isCommit(evidence.deployment.commit)
        && evidence.deployment.commit === head
        && isIsoDate(evidence.deployment.verifiedAt)
        && isIsoDate(evidence.deployment.availableThrough)
        && Date.parse(evidence.deployment.availableThrough) >= judgingAvailabilityDeadline;
      checks.push(check(
        "public_demo",
        "release",
        validDeployment ? STATUS.PASS : STATUS.FAIL,
        validDeployment
          ? `${evidence.deployment.url}; no-login verification recorded through judging`
          : "deployment URL, commit, timestamps, or availability-through-judging evidence is invalid",
      ));
    }
  }

  if (!evidence?.video.approvedByOwner) {
    checks.push(check("public_video", "owner", STATUS.PENDING_OWNER, "recording/publication approval is not recorded"));
  } else {
    const incompleteVideo = !evidence.video.url
      || evidence.video.durationSeconds === null
      || !evidence.video.public
      || !evidence.video.realHumanVoice
      || !evidence.video.codexAndGpt56UseSpoken
      || !evidence.video.verifiedAt;
    if (incompleteVideo) {
      checks.push(check("public_video", "release", STATUS.PENDING_EXTERNAL, "approved video still needs a public YouTube URL, <180s duration, human voice, spoken Codex/GPT-5.6 specifics, and verification time"));
    } else {
      const validVideo = isYouTubeUrl(evidence.video.url)
        && evidence.video.durationSeconds > 0
        && evidence.video.durationSeconds < 180
        && isIsoDate(evidence.video.verifiedAt);
      checks.push(check(
        "public_video",
        "release",
        validVideo ? STATUS.PASS : STATUS.FAIL,
        validVideo ? `${evidence.video.durationSeconds}s public YouTube video with required audio receipts` : "video URL, duration, or verification timestamp is invalid",
      ));
    }
  }

  if (!evidence?.codex.primarySessionId) {
    checks.push(check("codex_session_id", "owner", STATUS.PENDING_OWNER, "primary build-thread Session ID is not recorded"));
  } else {
    const validSession = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evidence.codex.primarySessionId);
    checks.push(check(
      "codex_session_id",
      "owner",
      validSession ? STATUS.PASS : STATUS.FAIL,
      validSession ? "primary Session ID format verified" : "Session ID must be the full UUID returned by /status",
    ));
  }

  if (!evidence) {
    checks.push(check("deployed_qa", "external", STATUS.PENDING_EXTERNAL, "deployed browser/device QA has not been recorded"));
  } else {
    const qaIncomplete = !evidence.qa.deploymentUrl
      || !evidence.qa.verifiedAt
      || evidence.qa.desktopBrowsers.length === 0
      || evidence.qa.mobileViewports.length === 0
      || evidence.qa.consoleErrorFree !== true
      || !evidence.qa.webglFallbackVerified
      || !evidence.qa.reducedMotionVerified
      || !evidence.qa.galleryCompared;
    if (qaIncomplete) {
      checks.push(check("deployed_qa", "external", STATUS.PENDING_EXTERNAL, "deployed QA needs desktop and mobile coverage, clean console, fallback/reduced-motion checks, and gallery comparison"));
    } else {
      const qaValid = isPublicHttpsUrl(evidence.qa.deploymentUrl)
        && evidence.qa.deploymentUrl === evidence.deployment.url
        && isIsoDate(evidence.qa.verifiedAt)
        && evidence.qa.desktopBrowsers.every((value) => value.trim().length >= 2)
        && evidence.qa.mobileViewports.every((value) => value.trim().length >= 2);
      checks.push(check(
        "deployed_qa",
        "external",
        qaValid ? STATUS.PASS : STATUS.FAIL,
        qaValid
          ? `${evidence.qa.desktopBrowsers.length} desktop browser(s), ${evidence.qa.mobileViewports.length} mobile viewport(s), fallback and accessibility checks recorded`
          : "QA URL/timestamp/browser evidence is invalid or does not match the deployment",
      ));
    }
  }

  if (!evidence || !evidence.devpost.track || !evidence.devpost.team || !evidence.devpost.country) {
    checks.push(check("devpost_entry", "external", STATUS.PENDING_EXTERNAL, "track, team mode, and country selections are not recorded from the live form"));
  } else {
    const devpostEntryReady = evidence.devpost.track.toLowerCase() === "education"
      && evidence.devpost.team.toLowerCase() === "individual"
      && /^(united states|us|usa)$/i.test(evidence.devpost.country.trim());
    checks.push(check(
      "devpost_entry",
      "external",
      devpostEntryReady ? STATUS.PASS : STATUS.FAIL,
      devpostEntryReady ? "Education / Individual / United States recorded" : "Devpost entry selections do not match the approved submission plan",
    ));
  }

  checks.push(check(
    "devpost_terms",
    "owner",
    evidence?.devpost.termsAccepted ? STATUS.PASS : STATUS.PENDING_OWNER,
    evidence?.devpost.termsAccepted ? "terms acceptance recorded" : "Devpost terms acceptance remains an owner action",
  ));

  if (!evidence?.devpost.finalSubmissionApproved) {
    checks.push(check("final_submission_approval", "owner", STATUS.PENDING_OWNER, "final VesselDelta submission approval is not recorded"));
  } else if (!evidence.devpost.finalSubmissionApprovedAt) {
    checks.push(check("final_submission_approval", "owner", STATUS.PENDING_OWNER, "final approval timestamp is still required"));
  } else {
    checks.push(check(
      "final_submission_approval",
      "owner",
      isIsoDate(evidence.devpost.finalSubmissionApprovedAt) ? STATUS.PASS : STATUS.FAIL,
      isIsoDate(evidence.devpost.finalSubmissionApprovedAt) ? "explicit final approval and timestamp recorded" : "final approval timestamp is invalid",
    ));
  }

  const requiredChecks = checks.filter((item) => item.required);
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, checks.filter((item) => item.status === status).length]));
  const failures = requiredChecks.filter((item) => item.status === STATUS.FAIL);
  const unresolved = requiredChecks.filter((item) => item.status !== STATUS.PASS);
  const fullyReady = unresolved.length === 0;
  const exitCode = failures.length > 0 ? 1 : (strict && !fullyReady ? 2 : 0);
  const result = {
    status: fullyReady ? "release-ready" : (failures.length ? "failed" : "not-release-ready"),
    fullyReady,
    strict,
    exitCode,
    ready: requiredChecks.length - unresolved.length,
    total: requiredChecks.length,
    counts,
    receipt: { present: receipt.present, path: "release-evidence.json", error: null },
    checks,
  };

  if (jsonOnly) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("VesselDelta release audit");
    for (const item of checks) console.log(`${item.status.padEnd(16)} [${item.group}] ${item.id}: ${item.detail}`);
    console.log(`\n${result.ready}/${result.total} required checks ready — ${result.status.toUpperCase()}`);
    if (!fullyReady) {
      console.log("Pending owner/external gates and warnings do not fail normal mode; strict mode requires every required check to PASS.");
    }
  }

  process.exitCode = exitCode;
}

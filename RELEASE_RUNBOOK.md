# VesselDelta release runbook

This runbook separates work Codex can verify locally from actions that require Fuzlullah's authorization, identity, voice, or final agreement. A checked box must be supported by the exact-commit `release-evidence.json` receipt; draft prose is not proof.

Official deadline: **July 21, 2026 at 5:00 PM PDT / 7:00 PM CDT**. Keep the public test link available through the judging period ending **August 5, 2026 at 5:00 PM PDT**.

## 1. Freeze a locally verified commit

- [ ] `npm ci`
- [ ] `npm run release:verify-local`
- [ ] `git diff --check`
- [ ] Commit the final local source, documentation, and gallery assets.
- [ ] Run `npm run release:audit:strict` and confirm that only owner/external gates remain.

## 2. Obtain VesselDelta-specific authorization

SNAP authorization does not transfer to VesselDelta. Before any release mutation, Fuzlullah must explicitly choose and authorize:

- [ ] VesselDelta's project license;
- [ ] public licensed repository, or private repository shared with both `testing@devpost.com` and `build-week-event@openai.com`;
- [ ] repository creation and push;
- [ ] Cloudflare deployment;
- [ ] individual submission in the Education category.

## 3. Publish the exact audited commit

- [ ] Push the frozen commit to the authorized repository route.
- [ ] Deploy that same commit to an unrestricted HTTPS URL with no login.
- [ ] Confirm the remote repository HEAD, deployment commit, and local audited commit are identical.
- [ ] Record repository and demo URLs in `release-evidence.json`.

## 4. Test the public deployment

- [ ] Fresh unauthenticated load in two desktop browsers.
- [ ] Mobile viewport and keyboard-access pass.
- [ ] WebGL view, explicit fallback, and reduced-motion behavior.
- [ ] All four scenarios and both 3D/2D views.
- [ ] Wall sculpting, flow drive, pressure-factor separation, restoration, and all four lenses.
- [ ] Mechanics check, rupture refusal, model card, Verify physics, and source links.
- [ ] No fresh-load console errors.
- [ ] Compare the deployed cover state with the gallery; recapture anything stale.

## 5. Retrieve the primary Codex Session ID

- [ ] In the primary VesselDelta build task, run `/status` and copy the Session ID.
- [ ] Record it in `release-evidence.json` and the Devpost field labeled `/feedback Codex Session ID`.

## 6. Record the real-voice demo

- [ ] Fuzlullah rehearses `VIDEO_SCRIPT.md` once with a timer.
- [ ] Record the working public build with real spoken audio.
- [ ] Export below three minutes; target 2:35–2:45 for upload safety.
- [ ] Confirm the audio says what was built, how Codex was used, and specifically what GPT-5.6 changed.
- [ ] Upload publicly to YouTube and verify it in a signed-out window.
- [ ] Record the URL and measured duration in `release-evidence.json`.

## 7. Complete Devpost without overclaiming

- [ ] Name: VesselDelta.
- [ ] Track: Education.
- [ ] Submitter: Individual — Fuzlullah Syed.
- [ ] Country: United States.
- [ ] Add the exact repository, demo, video, and Session ID values.
- [ ] Upload `thumbnail-1200x800.jpg`, then the ordered gallery from `submission-assets/README.md`.
- [ ] Rewrite the final description into Fuzlullah's natural voice; do not paste generated copy unchanged.
- [ ] Recheck every medical and CFD boundary in the preview.
- [ ] Fuzlullah personally reviews and accepts contest terms.
- [ ] Ask for explicit final-submit approval immediately before submission.

## 8. Final evidence gate

Run:

```bash
npm run release:audit:strict
```

Do not describe VesselDelta as released or submitted unless the strict audit passes and Devpost shows a confirmed submission receipt.

Official sources: [rules](https://openai.devpost.com/rules), [FAQ](https://openai.devpost.com/details/faqs), [dates](https://openai.devpost.com/details/dates).

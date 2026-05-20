---
name: principal-mailbox-prompt
description: "Script-driven, low-context workflow for generating 校长信箱 frontend projects or prompts. Use when extracting 校长信箱 business logic, generating a future frontend project prompt, or guiding implementation/test/release while preserving fixed portal APIs, host globals, payloads, jump URLs, and the two packaged pages: 登录页 and 首页."
---

# Principal Mailbox Prompt

Script-first skill for weaker models. Use scripts instead of paraphrasing the contract. Load `references/contract.md` only when a script is insufficient, a detail is disputed, or the contract itself is being edited.

## Always Do

- Resolve this skill folder as `SKILL_DIR`; use `node "$SKILL_DIR/scripts/<script>.mjs"` and never hardcode `.codex/skills/...` in generated instructions.
- Ask required confirmations once, wait up to 5 minutes, then use the script default. Timeout defaults count as confirmed and must record the timeout source.
- Treat generated projects as task-local. Do not write project decisions back into memory, this skill, `agents/openai.yaml`, `references/contract.md`, or future default prompts.
- For implementation tasks, create or edit real frontend files. Text-only output is allowed only when the user explicitly asks for a prompt/spec/document.

## Required Gates

Run these gates in order before any business implementation, task pack, mock preview, or release artifact:

1. **UI style**: ask with `ui-style-intake.mjs --mode questions`; if no answer after 5 minutes, write defaults with `ui-style-intake.mjs --mode default-style > ui-style.brief.md`.
2. **Homepage elements**: after style and before image generation, ask with `home-elements-dialog.mjs --mode questions`; save `homepage.answers.json` with `"__confirmedByUser": true`, or after timeout run `home-elements-dialog.mjs --mode defaults > homepage.answers.json`.
3. **Design image**: generate a prompt with `ui-style-intake.mjs --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json`, then create one 登录页+首页 design image, preferably with imagegen2. Ask for confirmation; if no answer after 5 minutes, accept the image.

Design image rules: it must strictly follow the whole skill contract, confirmed homepage elements, 登录页/首页 only, login-only 我的信件 secondary view, React + Ant Design default component model, error/loading/disabled states, SMS countdown, and preview/production separation. Enabled elements must appear; disabled or unconfirmed modules must not. If the image omits required elements or invents modules, regenerate it before coding.

Design-to-code rules: after design confirmation, run `design-fidelity-brief.mjs` and create `design-fidelity.map.md` before UI coding. The code must restore the confirmed design one-to-one for page structure, module placement, visual hierarchy, density, and interaction-state presentation. After implementation, preview and screenshot 登录页 and 首页, compare them against the design image, and keep iterating until there is no obvious structural or visual mismatch.

## Fixed Contract

- Default stack: React + Ant Design for empty/unspecified projects. Existing projects keep their stack unless migration is requested; existing React projects use Ant Design UI components.
- Flexible: folder structure, routing, styling method, state management, visual details.
- Fixed: `window` globals, endpoints, methods, payload nesting, response parsing, status mapping, fixed jump URLs, login success `data` redirect, and interaction standards.
- Packaged business entries: exactly 登录页 and 首页.
- Artifact format: detect from the target project with `detect-build-artifacts.mjs`; this repo currently builds two IIFE Web Component JS files, `portal.min.js` and `login.min.js`.
- Preview/production split: preview may use mock server, mock globals, test data, and `/preview/*`; production JS must not contain mock data, preview routes, localhost, `__artifact`, host-global overrides, or preview-server dependency.
- 我的信件列表: login-only secondary view under 首页. It is not a separate package artifact and must not request or render before login.
- Style is not contract. Visual direction comes only from user style, confirmed homepage answers, and confirmed design image.

## Commands

```sh
SKILL_DIR=/path/to/principal-mailbox-prompt
node "$SKILL_DIR/scripts/ui-style-intake.mjs" --mode questions
node "$SKILL_DIR/scripts/home-elements-dialog.mjs" --mode questions
node "$SKILL_DIR/scripts/ui-style-intake.mjs" --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json
node "$SKILL_DIR/scripts/detect-build-artifacts.mjs" --root .
node "$SKILL_DIR/scripts/task-pack.mjs" --mode context --root . --style-file ui-style.brief.md --answers homepage.answers.json --effect-image <approved-image>
node "$SKILL_DIR/scripts/task-pack.mjs" --mode write --root . --out principal-mailbox-task-pack --style-file ui-style.brief.md --answers homepage.answers.json --effect-image <approved-image>
node "$SKILL_DIR/scripts/design-fidelity-brief.mjs" --mode brief --style-file ui-style.brief.md --answers homepage.answers.json --effect-image <approved-image>
node "$SKILL_DIR/scripts/frontend-prompt-kit.mjs" --mode steps --style-file ui-style.brief.md --answers homepage.answers.json --effect-image <approved-image>
node "$SKILL_DIR/scripts/mock-preview-server.mjs" --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
node "$SKILL_DIR/scripts/task-pack.mjs" --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
```

## Implementation Order

1. Collect UI style, confirm homepage elements, generate/confirm a contract-compliant design image.
2. Detect scripts, entrypoints, and artifact format.
3. Create `design-fidelity.map.md`, missing page entries, contract helpers, contract tests, and mock preview.
4. Implement 登录页, interaction states, 首页 modules, and logged-in 我的信件 secondary view one-to-one against the design.
5. Screenshot-compare preview pages against the design, polish responsive behavior, build two artifacts, run contract lint, and smoke-test mock preview.

## Script Map

- `frontend-prompt-kit.mjs`: compressed prompt, steps, file list, business rules, artifacts, checklist, contract JSON.
- `task-pack.mjs`: compact context, numbered task pack, and verification wrapper.
- `ui-style-intake.mjs`: style/default intake, homepage-gated image prompt, visual gate fragment.
- `home-elements-dialog.mjs`: homepage business-element questions, timeout defaults, answer fragment.
- `design-fidelity-brief.mjs`: mandatory design decomposition and screenshot comparison gate.
- `detect-build-artifacts.mjs`: build/artifact inference from package and bundler config.
- `mock-preview-server.mjs`: local mock APIs, host globals, login/home previews, fixed jump pages.
- `contract-lint.mjs`: scans generated source/artifacts for globals, endpoints, jumps, payload markers, and production purity.

## Handoff Bar

Future models must be able to run scripts without reading `contract.md`. A valid implementation handoff lists changed files, preview command, build command, verification results, and keeps production artifacts pure while preserving all fixed business/API/interaction behavior.

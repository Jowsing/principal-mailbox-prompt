---
name: principal-mailbox-prompt
description: "Script-driven, low-context workflow for generating 校长信箱 frontend projects or prompts. Use when extracting 校长信箱 business logic, generating a future frontend project prompt, or guiding implementation/test/release while preserving fixed portal APIs, host globals, payloads, jump URLs, and the two packaged pages: 登录页 and 首页."
---

# Principal Mailbox Prompt

This skill is optimized for weaker models. Do not rely on memory or paraphrase the contract manually. Use the scripts first, and load the long reference only when editing the contract itself.

## Mandatory Visual Preflight

Before the existing business/project workflow, do this first:

1. Ask the user for a UI style description unless they already supplied one.
2. Run `node .codex/skills/principal-mailbox-prompt/scripts/ui-style-intake.mjs --mode prompt --style-file <style-file>` or pass `--style "<text>"` to generate an effect-image prompt.
3. Generate one effect image for 登录页 + 首页 with the available image-generation capability.
4. Ask the user to confirm or revise the effect image.
5. Only after the style description and confirmed effect image exist, continue with the Low-Context Protocol below.

Hard stop: do not create frontend files, task packs, business pages, mock preview, or release artifacts before the visual preflight is complete. The effect image controls visual direction only; it cannot override APIs, globals, payloads, jumps, artifacts, or interaction standards.

## Low-Context Protocol

1. Decide mode:
   - Need UI style intake first:
     `node .codex/skills/principal-mailbox-prompt/scripts/ui-style-intake.mjs --mode questions`
   - Need image prompt/style fragment:
     `node .codex/skills/principal-mailbox-prompt/scripts/ui-style-intake.mjs --mode prompt --style-file ui-style.brief.md`
   - Lowest-context implementation workflow:
     `node .codex/skills/principal-mailbox-prompt/scripts/task-pack.mjs --mode context --root .`
   - Materialize prompt/steps/files/checklist into numbered files:
     `node .codex/skills/principal-mailbox-prompt/scripts/task-pack.mjs --mode write --root . --out .codex/principal-mailbox-task-pack --style-file ui-style.brief.md --effect-image <approved-image>`
   - First identify package artifacts from the target project, not from page names:
     `node .codex/skills/principal-mailbox-prompt/scripts/detect-build-artifacts.mjs --root .`
   - Need reusable prompt/spec: run `node .codex/skills/principal-mailbox-prompt/scripts/frontend-prompt-kit.mjs --mode prompt`.
   - Need actual implementation: run `node .codex/skills/principal-mailbox-prompt/scripts/frontend-prompt-kit.mjs --mode steps` and `--mode files`, then create/edit the frontend project files.
   - Need homepage element decisions: run `node .codex/skills/principal-mailbox-prompt/scripts/home-elements-dialog.mjs --mode questions`.
   - Need QA/release checklist: run `node .codex/skills/principal-mailbox-prompt/scripts/frontend-prompt-kit.mjs --mode checklist`.
2. For implementation requests, creating files is mandatory:
   - Do not stop at a prompt, plan, checklist, or code snippets.
   - Create or edit real frontend engineering files in the target workspace.
   - Final handoff must list changed file paths, dev/preview command, build command, and verification results.
   - Only produce text-only output when the user explicitly asks for a prompt/spec/document instead of a project.
3. Preserve immutable contract exactly:
   - Default frontend stack: React + Ant Design. If the target directory is empty or the user does not specify a stack, create a React project and use Ant Design as the UI component framework.
   - Existing projects: follow the existing stack unless the user explicitly asks to migrate; when the existing project is React, use Ant Design for UI components.
   - Flexible: routing, styling, folder layout, and detailed UI implementation.
   - Fixed: `window` globals, endpoints, methods, payload nesting, response parsing, status mapping, jump URLs.
   - Output business entries: exactly 登录页 and 首页.
   - Package format: infer from current build scripts/config with `detect-build-artifacts.mjs`; in this repo it is two IIFE Web Component JS files, `portal.min.js` and `login.min.js`.
   - Preview and production are strictly separate. Preview may use mock server, mock globals, test data, and `/preview/*` shells. Production artifacts must be pure JS widgets: no mock data, no preview routes, no localhost URLs, no `__artifact` loader, no overriding host globals, and no dependency on the preview server.
   - 我的信件列表 must be a login-only secondary view under 首页: visitors see only the entry/login redirect; the list is rendered and requested only after login. It is not a separate packaged artifact.
   - Style details are not part of this skill; do not preserve current colors, images, spacing, radius, shadows, or CSS values as contract.
4. Implement in this order for code work:
   - collect UI style description
   - generate and confirm one effect image
   - discover scripts/entrypoints and artifact format
   - ask homepage element choices with `home-elements-dialog.mjs`
   - create two page entries if missing
   - contract helpers
   - contract tests
   - mock preview
   - 登录页
   - interaction states: errors, loading, disabled, SMS countdown
   - 首页 modules, including logged-in 我的信件 secondary view
   - responsive polish
   - build two Web Component JS artifacts
   - contract lint
   - mock preview smoke
5. Use `scripts/mock-preview-server.mjs` for local preview with fixed mock APIs and test data:
   `node .codex/skills/principal-mailbox-prompt/scripts/mock-preview-server.mjs --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js`
6. Use `scripts/contract-lint.mjs` before release:
   `node .codex/skills/principal-mailbox-prompt/scripts/contract-lint.mjs --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js`
   Or use the wrapper:
   `node .codex/skills/principal-mailbox-prompt/scripts/task-pack.mjs --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js`
7. Load `references/contract.md` only when the scripts are insufficient, a detail is disputed, or the user asks to update the underlying contract.

## Script Map

- `scripts/frontend-prompt-kit.mjs`: emits the compressed prompt, atomic implementation passes, checklist, or JSON contract.
- `scripts/task-pack.mjs`: orchestrates the other scripts into a compact context, numbered task-pack files, or one-command verification.
- `scripts/ui-style-intake.mjs`: asks for UI style input, emits an effect-image prompt, and produces the visual gate fragment.
- `scripts/detect-build-artifacts.mjs`: reads `package.json` and bundler config to determine whether release artifacts are JS components, HTML pages, or another format.
- `scripts/home-elements-dialog.mjs`: emits or interactively asks homepage business-element choices; it avoids style questions.
- `scripts/mock-preview-server.mjs`: serves local mock APIs, host globals, login/home previews, and fixed jump pages.
- `scripts/contract-lint.mjs`: scans a generated project for required globals, endpoints, jumps, payload markers, and optional login/home artifacts.

## Acceptance Bar

- Future models can generate the frontend by running scripts without reading `contract.md`.
- Future models must collect UI style, generate and confirm an effect image, then run the existing project workflow.
- Scripted steps cover context assembly, artifact detection, homepage option materialization, prompt/steps/files/checklist generation, preview, and verification.
- Implementation requests produce real frontend files, not only plans or prompts.
- Generated prompt/code defaults to React + Ant Design for new/unspecified projects while preserving existing project stack when required.
- Generated prompt/code states that only APIs/globals/payloads/jumps are fixed; project structure remains flexible.
- Generated prompt/code keeps business logic detailed and takes visual direction only from the required UI style description plus confirmed effect image.
- Generated prompt/code defines interaction standards: field/API/network errors, loading/disabled states, retry, success feedback, and SMS countdown behavior.
- Generated project builds the current-format two artifacts: 首页 Web Component JS and 登录页 Web Component JS.
- Artifact paths/formats are confirmed from scripts/config and actual build output, not assumed from page names.
- Production JS artifacts are pure and environment-agnostic; all preview/mock/test-data wiring is external to the build output.
- Mock preview works before backend access.
- Contract lint, available build checks, and smoke tests are part of the handoff.

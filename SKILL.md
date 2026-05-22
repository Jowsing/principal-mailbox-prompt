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

Interactive shortcut: run `interactive-wizard.mjs --root . --out principal-mailbox-interactive`. It walks through the gates below, waits for user input, applies 5-minute defaults, writes all intermediate files, and emits the task pack.

1. **UI style**: ask with `ui-style-intake.mjs --mode questions`; if no answer after 5 minutes, write defaults with `ui-style-intake.mjs --mode default-style > ui-style.brief.md`.
2. **Component list**: after style and before image generation, ask with `home-elements-dialog.mjs --mode questions`; this asks for current-project component slots, not freeform modules. Save `homepage.answers.json` with `"__confirmedByUser": true`, or after timeout run `home-elements-dialog.mjs --mode defaults > homepage.answers.json`.
3. **Design image**: generate a prompt with `ui-style-intake.mjs --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json`, then create one 登录页+首页 design image, preferably with imagegen2. Ask for confirmation; if no answer after 5 minutes, accept the image.

Reference rules: before design generation, run `design-reference-kit.mjs --mode study` and `--mode scheme`. Learn from world-famous university official sites and from non-school excellent projects/design systems such as public-service design systems, product websites, and Ant Design/Pro Layout. Only absorb information architecture, service flow, visual craft, component systems, and layout strategies; do not copy any specific website, image, text, or template.

Template rules: use the current project component-slot structure as the skeleton. Run `component-template-kit.mjs --mode catalog`, `--mode variants`, `--mode quality`, or `--mode write` to get template code, layout variants, and UI quality gates. The user style description decides school identity, layout variant, visual assets, style tokens, and density; the user component list decides which existing slots are filled. Do not invent modules outside the selected slots.

Design image rules: it must strictly follow the whole skill contract, confirmed component list, 登录页/首页 only, login-only 我的信件 secondary view, React + Ant Design component matrix, error/loading/disabled states, SMS countdown, and preview/production separation. Enabled component slots must appear; disabled or unconfirmed slots must not. Each school must have a differentiated layout variant; repeated same-page skeletons are invalid. decorativeAssets=yes requires at least two school visual assets, such as logo, campus hero image, landmark building, campus texture, or imagegen2-generated equivalents. If the image omits required slots, lacks school images, uses the same layout for every school, invents modules, or shows poorly aligned widgets, regenerate it before coding.

Design-to-code rules: after design confirmation, run `design-fidelity-brief.mjs` and create `design-fidelity.map.md` before UI coding. The code must restore the confirmed design one-to-one for page structure, module placement, visual hierarchy, density, school images, Ant Design component use, alignment, and interaction-state presentation. React implementations must use Ant Design for layout/grid, form, input, button, card, tabs, list, drawer, modal, rating, message, empty/loading/error states, and tags. After implementation, preview and screenshot 登录页 and 首页, compare them against the design image, and keep iterating until there is no obvious structural, alignment, component, or visual mismatch.

## Fixed Contract

- Default stack: React + Ant Design for empty/unspecified projects. Existing projects keep their stack unless migration is requested; existing React projects use Ant Design UI components.
- Flexible: folder structure, routing, styling method, state management, visual details.
- Fixed: `window` globals, endpoints, methods, payload nesting, response parsing, status mapping, fixed jump URLs, login success `data` redirect, and interaction standards.
- Packaged business entries: exactly 登录页 and 首页.
- Artifact format: detect from the target project with `detect-build-artifacts.mjs`; this repo currently builds two IIFE Web Component JS files, `portal.min.js` and `login.min.js`.
- Preview/production split: preview may use mock server, mock globals, test data, and `/preview/*`; production JS must not contain mock data, preview routes, localhost, `__artifact`, host-global overrides, or preview-server dependency.
- 我的信件列表: login-only secondary view under 首页. It is not a separate package artifact and must not request or render before login.
- Style is not contract. Visual direction comes only from user style, confirmed component-list answers, component template, selected layout variant, school visual assets, Ant Design quality rules, and confirmed design image.

## Commands

```sh
SKILL_DIR=/path/to/principal-mailbox-prompt
node "$SKILL_DIR/scripts/interactive-wizard.mjs" --root . --out principal-mailbox-interactive
node "$SKILL_DIR/scripts/ui-style-intake.mjs" --mode questions
node "$SKILL_DIR/scripts/home-elements-dialog.mjs" --mode questions
node "$SKILL_DIR/scripts/component-template-kit.mjs" --mode write --out principal-mailbox-component-template
node "$SKILL_DIR/scripts/component-template-kit.mjs" --mode variants
node "$SKILL_DIR/scripts/component-template-kit.mjs" --mode quality
node "$SKILL_DIR/scripts/design-reference-kit.mjs" --mode study
node "$SKILL_DIR/scripts/design-reference-kit.mjs" --mode scheme
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

1. Collect UI style, confirm component list, study references, write/read the component template, select a layout variant, require school visual assets, generate/confirm a contract-compliant design image.
2. Detect scripts, entrypoints, and artifact format.
3. Create `design-fidelity.map.md`, missing page entries, contract helpers, contract tests, and mock preview.
4. Implement 登录页, interaction states, 首页 modules, and logged-in 我的信件 secondary view one-to-one against the design, using Ant Design components for all matching UI controls.
5. Screenshot-compare preview pages against the design, verify school images, layout difference, AntD component fidelity, small-widget alignment, responsive behavior, build two artifacts, run contract lint, and smoke-test mock preview.

## Script Map

- `frontend-prompt-kit.mjs`: compressed prompt, steps, file list, business rules, artifacts, checklist, contract JSON.
- `interactive-wizard.mjs`: terminal wizard for required user replies, 5-minute defaults, reference/template generation, design prompt, design reference capture, and task-pack writing.
- `task-pack.mjs`: compact context, numbered task pack, and verification wrapper.
- `ui-style-intake.mjs`: style/default intake, homepage-gated image prompt, visual gate fragment.
- `home-elements-dialog.mjs`: current-project component-slot questions, timeout defaults, answer fragment.
- `component-template-kit.mjs`: component catalog, layout variants, UI quality rules, and React + Ant Design template code based on the existing project blocks.
- `design-reference-kit.mjs`: learned reference patterns from world-famous university official sites and non-school excellent websites/design systems, plus a refined implementation scheme.
- `design-fidelity-brief.mjs`: mandatory design decomposition and screenshot comparison gate.
- `detect-build-artifacts.mjs`: build/artifact inference from package and bundler config.
- `mock-preview-server.mjs`: local mock APIs, host globals, login/home previews, fixed jump pages.
- `contract-lint.mjs`: scans generated source/artifacts for globals, endpoints, jumps, payload markers, and production purity.

## Handoff Bar

Future models must be able to run scripts without reading `contract.md`. A valid implementation handoff lists changed files, preview command, build command, verification results, and keeps production artifacts pure while preserving all fixed business/API/interaction behavior.

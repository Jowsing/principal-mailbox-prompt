# 校长信箱 Prompt Contract

Default workflow: use `scripts/frontend-prompt-kit.mjs` to emit compressed prompts, steps, and checklists. Read this full contract only when updating the contract or resolving missing details.

Project structure is flexible. Backend APIs, host globals, payload formats, response normalization, and jump URLs are fixed. Default frontend stack is React + Ant Design when the target is empty or the user does not specify a stack; existing projects should keep their current stack unless the user explicitly asks to migrate.

Style details are intentionally not part of this contract. Do not preserve or require current colors, images, spacing, radius, shadows, typography, or CSS values. Business logic must be detailed. Before generating or implementing the project, collect a user UI style description, then ask and confirm homepage business elements, then enrich sparse input with professional school-portal structure, school identity cues, refined visual quality, and broad inspiration from strong university homepages worldwide. Only after homepage elements are confirmed, generate one design/effect image for 登录页 + 首页 preferably with imagegen2 and get user confirmation. Preview/design image generation must follow this entire skill contract, not only the visual style text. The design image must be driven by confirmed homepage elements: enabled elements appear, disabled elements do not appear, and unconfirmed modules are not invented. If the design omits required skill elements or invents unconfirmed modules, regenerate it before coding. Do not copy a single university template; for different schools, keep visual template similarity below 50% by varying layout framework, hero composition, module order, color system, campus symbols, and component treatment. That confirmed design drives page structure, module placement, visual hierarchy, density, and interaction-state presentation one-to-one, but it never overrides the business contract. Before UI coding, create design-fidelity.map.md from the confirmed design; before handoff, screenshot login/home previews and compare them against the design until there is no obvious structural or visual mismatch.

## Default Frontend Stack

- Empty target directory or unspecified stack: create a React project and use Ant Design as the UI component framework.
- Existing React project: reuse existing React version and introduce/use Ant Design for form, input, button, modal, drawer, message/toast, tabs, pagination, loading, and empty/error states.
- Existing non-React project: follow the existing stack unless the user explicitly asks to migrate; keep the business contract unchanged.
- User-specified stack overrides the default stack, but never overrides fixed APIs, globals, payloads, jumps, artifacts, login flow, preview/production separation, or interaction standards.

## Scripted Low-Context Workflow

Prefer scripts over manually carrying long context:

```sh
SKILL_DIR=/path/to/principal-mailbox-prompt
node "$SKILL_DIR/scripts/ui-style-intake.mjs" --mode questions
node "$SKILL_DIR/scripts/home-elements-dialog.mjs" --mode questions
node "$SKILL_DIR/scripts/ui-style-intake.mjs" --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json
node "$SKILL_DIR/scripts/task-pack.mjs" --mode context --root . --answers homepage.answers.json --style-file ui-style.brief.md --effect-image <approved-image>
node "$SKILL_DIR/scripts/task-pack.mjs" --mode write --root . --out principal-mailbox-task-pack --answers homepage.answers.json --style-file ui-style.brief.md --effect-image <approved-image>
```

Then execute the generated numbered files in `principal-mailbox-task-pack`.

Verification wrapper:

```sh
node "$SKILL_DIR/scripts/task-pack.mjs" --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
```

Use individual scripts only when a specific output is needed:

- `ui-style-intake.mjs`: ask for UI style, require confirmed homepage answers before design generation, emit design/effect-image prompt, and materialize the style fragment.
- `design-fidelity-brief.mjs`: emit mandatory design decomposition and screenshot comparison gates.
- `detect-build-artifacts.mjs`: infer package artifact format.
- `home-elements-dialog.mjs`: ask homepage business choices and validate confirmed answers.
- `frontend-prompt-kit.mjs`: emit prompt, steps, files, business rules, artifact rules, checklist, or JSON contract.
- `mock-preview-server.mjs`: serve mock APIs and preview shells.
- `contract-lint.mjs`: scan generated projects and artifacts.

## Business

Build a “校长信箱” frontend for schools to collect suggestions, consultations, complaints, and feedback.

Core flows:

- Visitor browses 首页 and 来信选登.
- Visitor clicks 我要写信 or 我的信件 and is guided to login.
- User logs in by phone + SMS code or unified auth.
- User writes a letter after 来信须知 confirmation when configured.
- User views 我的信件, progress, details, and replies.
- User edits/deletes drafts, withdraws eligible in-progress letters, evaluates replied letters.
- User views campus service phone numbers when enabled.
- PC and mobile layouts are independent; business/API helpers can be shared.

## Build Artifact Format

The business entries are exactly 登录页 and 首页. The package format must be inferred from the current project's build scripts and bundler config before implementation or release.

First run:

```sh
node "$SKILL_DIR/scripts/detect-build-artifacts.mjs" --root .
```

Then confirm the script output against the actual production build output.

Current repo format:

- 首页 build: `pnpm build:home`
- 首页 Vite mode: `home-component`
- 首页 entry: `src/entry-home-component.ts`
- 首页 artifact: single IIFE JavaScript Web Component, `portal.min.js`
- 首页 custom element: `<principal-mailbox-home-widget>`
- 首页 observed attributes: `view`, `logged-in`, `login-url`
- 登录 build: `pnpm build:login`
- 登录 Vite mode: `login-component`
- 登录 entry: `src/entry-login-component.ts`
- 登录 artifact: single IIFE JavaScript Web Component, `login.min.js`
- 登录 custom element: `<principal-mailbox-login-widget>`
- 登录 observed attributes: `unified-auth-url`, `submit-url`, `phone-field-name`, `code-field-name`
- CSS is injected into JS by the build plugin; do not require separate CSS assets for release.
- Current `vite.config.ts` writes both component build outputs to the backend resource `page/` directory; local preview examples may use `dist-home/portal.min.js` and `dist-login/login.min.js`.
- Optional legacy outputs are not the two-page release contract: `pnpm build` can produce single inlined `dist/index.html`; `pnpm build:js` can produce combined widget `dist-js/principal-mailbox-widget.min.js`.

## Pages

- 登录页: logo/title, phone, SMS code, 60s countdown, login, unified auth, validation.
- 首页: brand header, login/user menu, 我要写信, 我的信件登录后二级视图, service phone entry, 来信选登, 来信须知确认, 校园服务电话, 评价弹窗, and fixed write/detail/edit jumps.

Homepage modules:

- 来信选登: type tabs/search/list/loading/empty.
- 我的信件: login-only secondary view under 首页; filters for title/status/type, search/reset, letter cards/list, progress, actions.
- 我要写信: fetch config first; if `noticeContent` exists, show 来信须知 and continue only after confirmation; then fixed jump unless user asks for internal form.
- 详情/编辑: fixed jumps by default.
- 校园服务电话: summary + full searchable list; hide all phone UI when `showPhone` is false.
- 评价弹窗: dynamic dimensions, rating, star texts, 500-char comment, validation, submit, refresh list.

## Models

```ts
interface PortalConfig { showPhone: boolean; noticeContent: string }
interface ServicePhoneItem { name: string; phone: string }
interface OptionItem { label: string; value: string }
interface PublicLetterCard {
  id: string; readId: string; tag: string; title: string; date: string
  summary: string; replyTitle: string; replyContent: string
  readCount: string; satisfactionTitle: string; satisfaction: string
}
type MailStatus = '已回复' | '草稿' | '处理中'
type MailAction = '撤回' | '评价' | ''
type MailProgressState = 'done' | 'active' | 'pending'
type MailProgressStep = 1 | 2 | 3 | 4
interface MailListItem {
  id: number; bizId: string; rawStatus: string; status: MailStatus
  type: string; code: string; date: string; title: string; summary: string
  progress: MailProgressStep
  progressState: Extract<MailProgressState, 'done' | 'active'>
  progressItems: Array<{ label: string }>
  action: MailAction
}
interface EvaluateItem {
  id: string; dimensionName: string; defaultRating: number; starTexts: string[]
}
const progressSteps = ['信件提交', '信件分派', '信件回复', '信件评价']
```

## Fixed Host Globals

```ts
interface Window {
  contextPath?: string
  userId?: string | number | null
  userName?: string | number | null
  logoPath?: string
}

function buildPortalUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const contextPath = (window.contextPath || '').trim()
  const base = !contextPath || contextPath === '/' ? '' : contextPath.endsWith('/') ? contextPath.slice(0, -1) : contextPath
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

function hasLoggedInUser() {
  const userId = window.userId
  if (typeof userId === 'string') return userId.trim().length > 0
  return Boolean(userId)
}
```

Rules:

- All relative APIs and jumps use `buildPortalUrl`.
- Login state comes from `window.userId`.
- Username displays `window.userName || '用户'`.
- Logo uses `buildPortalUrl(window.logoPath || '')`.
- Dev preview may seed globals only when absent; production must read host values and must not override them.

## Preview vs Production Boundary

Preview is a separate local harness. Production artifacts are pure.

- Preview may provide mock endpoints, mock globals, mock logo, test rows, preview HTML shells, `/preview/*` routes, and `/__artifact/*` loaders.
- Production artifacts are only the two built JS widgets: `portal.min.js` and `login.min.js`.
- Production JS must contain no mock rows, `mock-user`, `mock-logo.svg`, local preview copy, `/preview/`, `/__artifact/`, `mock-preview-server`, `localhost`, or `127.0.0.1`.
- Production JS must not import preview/mock modules, start a mock server, register preview routes, or seed `window.contextPath`, `window.userId`, `window.userName`, or `window.logoPath`.
- The preview server may serve production JS for smoke tests, but it must not mutate, wrap into, or become part of the production artifacts.

## Request Contract

POST requests:

- `credentials: 'include'`
- `Accept: 'application/json'`
- `Content-Type: 'application/json'`
- JSON body

Logout uses GET with `credentials: 'include'` and `Accept: 'application/json'`.

Response handling:

- Read text, then `JSON.parse`; fallback `{ message: text, data: text }`.
- Success: `success === true`, `code === '0'`, `result === true`, or `status` in `0/1/200/'0'/'1'/'200'/'ok'/'success'`.
- Error message keys: `message`, `msg`, `errorMessage`, `error`, `desc`.
- Unwrap order: `data`, `rows`, `list`, original payload.
- List keys: `list`, `rows`, `items`, `records`, `children`, nested in `page`, `modelData`, `data`.
- Total keys: `recordCount`, `total`, `totalCount`, `records`, including nested payloads.

Login redirect response:

- `POST /plugins/xzxx/portal/doLogin` success response uses `data` itself as the redirect URL.
- Example: `{ success: true, code: '0', data: '/plugins/xzxx/portal/index' }`.
- Login must read `response.data` first. If it is a non-empty string, normalize it as the redirect target.
- Only when `data` is empty or not a string should login fallback to `redirectUrl`, `redirectURI`, `url`, `location`, or `targetUrl`.

## Interaction Standards

These standards define behavior only. They do not define colors, spacing, icons, motion, or visual style.

- All async actions must expose `idle`, `loading`, `success`, `error`, and `disabled` or equivalent states.
- While an async action is loading, its trigger must be disabled to prevent duplicate requests.
- Failed actions must restore the previous operable state unless the business flow requires redirect.
- Error feedback has two layers: field validation errors stay with the field; API/network errors show in a shared message area, toast, or dialog.
- Error copy must prefer normalized backend messages from `message`, `msg`, `errorMessage`, `error`, `desc`; fallback API copy is `操作失败，请稍后重试`; network fallback is `网络异常，请稍后重试`.
- Field validation failure must not send requests. Focus or scroll to the first invalid field when practical. Editing a field clears that field's stale error.
- Success feedback is required for destructive or state-changing operations such as delete, withdraw, evaluate, logout, and SMS send.
- Canceling a confirmation dialog is not an error and must not show error feedback.
- Lists must support initial loading, empty state, error state, retry, load-more loading, and no-more-data state.
- Dialogs and drawers must support loading, validation error, API error, submitting, success, and close/reset behavior.

SMS countdown standard:

- Initial code button text: `获取验证码`.
- Click first validates phone with `^1\d{10}$`; invalid phone sets field error and sends no request.
- During SMS request: show `发送中`, disable the code button, and block duplicate clicks.
- Start the 60-second countdown only after SMS API success.
- During countdown: disable the code button and show `{n}s后重发`.
- At zero: clear timer, enable the code button, and show `重新获取`.
- SMS API failure: do not start countdown; restore the button; show normalized error feedback.
- Component unmount or page teardown must clear the timer.

## Fixed Endpoints

```ts
const PORTAL_ENDPOINTS = {
  logout: '/admin/upms/login/doLogout',
  sms: '/plugins/xzxx/portal/sms',
  login: '/plugins/xzxx/portal/doLogin',
  config: '/plugins/xzxx/portal/getConfig',
  phoneList: '/plugins/xzxx/portal/phoneList',
  letterTypeList: '/plugins/xzxx/portal/letterTypeList',
  registerLetters: '/plugins/xzxx/portal/registerLetters',
  myLetters: '/admin/api/query/xzxx_task_startByMeList',
  evaluateList: '/plugins/xzxx/portal/getEvaluateList',
  read: '/plugins/xzxx/portal/read',
  rate: '/admin/api/execute/xzxx_letter_rate',
  remove: '/admin/api/execute/xzxx_letter_remove',
  startBackTo: '/admin/api/execute/xzxx_letter_startBackTo'
} as const
```

Usage:

- SMS: `POST /plugins/xzxx/portal/sms`, `{ phone }`.
- Login: `POST /plugins/xzxx/portal/doLogin`, `{ phone, code }`; external `submitUrl` may replace path only.
- Logout: `GET /admin/upms/login/doLogout?redirect=${buildPortalUrl('/plugins/xzxx/portal/index')}`.
- Config: `POST /plugins/xzxx/portal/getConfig`, `{}`.
- Phone list: `POST /plugins/xzxx/portal/phoneList`, default `{ pageNo: 1, pageSize: 20 }`.
- Letter types: `POST /plugins/xzxx/portal/letterTypeList`, `{}`.
- Public letters: `POST /plugins/xzxx/portal/registerLetters`, converted query payload.
- My letters: `POST /admin/api/query/xzxx_task_startByMeList`, converted query payload.
- Evaluate dimensions: `POST /plugins/xzxx/portal/getEvaluateList`, `{}`.
- Read count: `POST /plugins/xzxx/portal/read`, `{ bizId: readId }`.
- Rate: `POST /admin/api/execute/xzxx_letter_rate`, `{ params: { letterParam: { bizId, rateForm } } }`.
- Withdraw: `POST /admin/api/execute/xzxx_letter_startBackTo`, `{ params: { letterParam: { bizId } } }`.
- Remove draft: `POST /admin/api/execute/xzxx_letter_remove`, `{ params: { letterParam: { bizId } } }`.

## Fixed Jump URLs

- Portal login: `buildPortalUrl('/plugins/xzxx/portal/login')`
- Unified auth: `buildPortalUrl('/plugins/xzxx/portal/ids-login')`
- Write: `buildPortalUrl('/page/xzxx/formPage')`
- Detail: `buildPortalUrl('/page/xzxx/formPage#/?bizId=${encodeURIComponent(rowId)}&source=view')`
- Draft edit: `buildPortalUrl('/page/xzxx/formPage#/?bizId=${encodeURIComponent(rowId)}')`

Open detail/edit/write with:

```ts
window.open(targetUrl, '_blank', 'noopener,noreferrer')
```

## Query Conversion

Input supports `pageNo`, `pageSize`, `keyword`, `letterType`, `status`, `querySetting`.

Convert to `querySetting`:

- `letterType`: `{ name: 'letterType', value, linkOpt: 'and', builder: 'equal' }`
- `已回复`: `reviewed`, `evaluated`
- `草稿`: `draft`
- `处理中`: `to_review`, `to_confirm`, `suspend`, `xf_doing`, `xf_done`
- multi-status: first `and`, later `or`
- `keyword`: OR group of `title include` and `pageoffice include`

After conversion, remove top-level `keyword`, `letterType`, `status`, and original `querySetting`.

## Normalization

- Service phone name: `name`, `deptName`, `departmentName`, `orgName`, `title`.
- Service phone number: `phone`, `telephone`, `tel`, `mobile`, `deptPhone`.
- Config: `showPhone` boolean-compatible default `true`; notice from `payload.notice` or payload fields `noticeContent`, `content`, `notice`; empty stripped text means no notice.
- Letter type label: `itemName`, `name`, `label`, `text`, `typeName`, `letterTypeName`, `value`; value: `itemId`, `id`, `code`, `value`, label; dedupe by value.
- Evaluate item: `id`; name from `dimensionName`, `name`, `title`; filter `deleteFlag=true` and `usedFlag=false`; star fields `oneStar` to `fiveStar`; defaults `很差/不满意/一般/满意/非常满意`; `defaultFiveStarFlag` => rating 5.
- Letter dict text order: `${key}Name`, `${key}_name`, `${key}$NAME`, `${key}Text`, `key`.
- Status: `draft` or contains `草稿` => `草稿`; `reviewed/evaluated` or contains `已回复/已评价` => `已回复`; else `处理中`.
- Type: `letterType` dict text, fallback `咨询`.
- Title: `title`, `subject`, fallback `未命名信件`.
- Summary: stripped `pageoffice`, `content`, `remark`, fallback `暂无正文`.
- Code: `serialNumber`, `code`, `id`, fallback `-`.
- Date: `createTime`, `replyTime`, `updateTime`, first 10 chars, fallback `-`.
- `bizId`: `bizId`, `id`, `serialNumber`.
- Reply user: `replyUserName`, `replyUserId`, `replyDeptName`, `replyOrgName`.
- Reply content: stripped `replyContent`, `reply`, `remark`, fallback `暂无回复内容`.
- Read count: `readCount`, `viewCount`, `browseCount`, fallback `0`.
- Redirect: login success first uses string `data` as the redirect URL; fallback keys are `redirectUrl`, `redirectURI`, `url`, `location`, `targetUrl`. Absolute URLs and `/` paths are direct; other relative values go through `buildPortalUrl`.

## Status, Actions, Progress

```ts
const statusMap = {
  reviewed: '已回复',
  evaluated: '已回复',
  draft: '草稿',
  to_review: '处理中',
  to_confirm: '处理中',
  suspend: '处理中',
  xf_doing: '处理中',
  xf_done: '处理中'
}
```

- `draft`: edit/delete.
- `to_review`: withdraw.
- `reviewed`/`evaluated`: evaluate.
- Others: view only.
- Progress: draft step 1 active; submitted step 2 active; in progress step 2/3 active; replied step 4 pending/active; evaluated step 4 done.

## Runtime Business Logic

Login and redirect:

- Login state only uses `window.userId`; trim strings and treat empty strings as logged out.
- Login URL must preserve redirect. Read redirect from query keys `redirect`, `redirectUrl`, `redirectURI`, `redirect_uri`; absolute URLs and `/` paths are used directly, other relative values go through `buildPortalUrl`.
- Login entry uses current URL as redirect. My letters entry uses current URL with `view=mail`. Public letter detail uses fixed detail URL as redirect when visitor is logged out.
- SMS sends only after phone validates `^1\d{10}$`; code button follows the SMS countdown standard and prevents duplicate sends.
- Login validates phone and non-empty 6-digit-code field, prevents duplicate submit, and posts `{ phone, code }`; if redirect exists, include `redirect`; `submitUrl` may override only the login path.
- Login submit button is disabled/loading during submit. Failure preserves phone/code inputs and shows normalized error feedback; success is the only path that redirects or switches local login state.
- Login success first follows `response.data` as the redirect URL. If `data` is empty or not a string, fallback to normalized response redirect keys (`redirectUrl`, `redirectURI`, `url`, `location`, `targetUrl`); if absent, switch local state to logged in.
- Unified auth uses fixed IDS login URL and also carries redirect.
- Logout is GET with redirect to portal index; success first follows response redirect, otherwise switches local state to logged out.

Home page:

- 首页 may internally switch between `home` and `mail` views, but still builds as one 首页 artifact. The `mail` view is the login-only secondary view for 我的信件.
- Before generating 首页, ask homepage business-element choices with `scripts/home-elements-dialog.mjs --mode questions`; save all choices to `homepage.answers.json` with `"__confirmedByUser": true`; unanswered choices must block generation, not fall back to defaults.
- Public letters load on mount with `pageNo=1`, `pageSize=20`; category list starts with `全部` and then `letterTypeList`; category change resets to page 1.
- PC public-letter keyword search uses 300ms debounce and enter search; mobile may use category-only unless user selects mobile search.
- Public-letter list uses request-sequence/race guard. Reset replaces list; load-more appends; `hasMore` compares current count with total.
- Clicking a public letter with no id shows `缺少信件标识`. Visitor click redirects to login with detail URL. Logged-in click opens fixed detail URL, then posts read `{ bizId: readId }`; on success, local numeric `readCount` increments by 1.
- Write click must call `getConfig` first. If `noticeContent` contains stripped text, show 来信须知; confirmation opens fixed write URL. If no notice, open fixed write URL immediately.
- `showPhone` defaults true. If false, hide all service-phone UI, clear phone list, and close the phone drawer.
- Home service-phone summary may request a small page, e.g. `{ pageNo: 1, pageSize: 12 }`; drawer open should force request `{ pageNo: 1, pageSize: 9999 }` and filter locally by name or phone.

My letters:

- My letters is a login-only secondary view under 首页, not a separate packaged page.
- Visitors must not request or render the my-letters list. Visitor clicks on 我的信件 redirect to login with current URL plus `view=mail`; after login, the returned 首页 opens the `mail` secondary view and then requests `startByMeList`.
- Filters: title/keyword, status (`已回复`, `草稿`, `处理中`), letter type; reset clears all filters and reloads page 1.
- Default list request uses `pageNo=1`, `pageSize=20`; PC supports load more by total; mobile can reload first page on debounced filter change.
- Every card has detail view. Draft (`rawStatus=draft`) shows edit and delete. `rawStatus=to_review` shows withdraw. `rawStatus=reviewed/evaluated` shows evaluate.
- Delete and withdraw require confirmation; cancel/close should not show error; success refreshes list.
- Evaluate opens by fetching `evaluateList`, builds default ratings from `defaultFiveStarFlag`, requires every dimension to have a rating, adds `remark` from trimmed comment, submits rate payload, closes modal, then refreshes list.

Caching and concurrency:

- Cache config, phone list, letter type list, and evaluate list. Concurrent requests share the same Promise. `force=true` bypasses cache and updates it.
- List loaders must use a request id or equivalent race guard so older responses cannot overwrite newer state.

## Implementation Workflow

1. Visual preflight: ask for UI style description; before any design image, ask and confirm homepage business elements; then supplement missing design detail with a professional school-facing portal framework, school identity cues, refined/beautiful UI quality, worldwide university-homepage inspiration, and the full skill contract; generate one 登录页 + 首页 design/effect image with imagegen2 when available and based on the confirmed elements; ensure different schools do not share templates above 50% similarity; get user confirmation. Stop before implementation if style, homepage answers, or confirmed design is missing.
2. Intake: decide prompt/spec vs actual implementation; confirm stack, PC/mobile scope, internal pages vs fixed jumps, backend vs mocks.
3. Discover: read manifest, lockfile, scripts, bundler config, routing, API wrapper, deploy docs; infer actual package artifact format before coding.
4. Layout source: confirmed design image, confirmed homepage element answers, login/home Web Component entries, route/state, API contract, host globals, models, normalization, PC/mobile variants, UI components, styles, mocks, tests.
5. Dev wiring: seed `window` globals only in dev, provide logged-in/out previews, mock fixed endpoints if needed, keep endpoint strings unchanged.
6. Contract layer: implement helpers, response handling, query conversion, fixed APIs, fixed jumps. Test before UI.
7. Models: normalize config, phone, type, evaluate dimensions, statuses, actions, progress, public letters, my letters.
8. Page states: visitor, logged-in, login, homepage, my letters module, notice dialog, phone drawer, evaluate dialog, loading, empty, error, disabled.
9. Pages: produce exactly two business entries, 登录页 and 首页, packaged in the current repo as two Web Component JS artifacts. Put my letters, notice-before-write, service phone, evaluate, public letters, and fixed jumps inside 首页 modules.
10. Interactions: debounce search, guard request races, prevent duplicate submits, confirm delete/withdraw, refresh after mutations.
11. Polish against the confirmed design image only for visuals and usability states; do not encode current project style details as contract.

## Local Preview and Mock Data

Generated projects should include a preview path before backend access is ready.

Use or adapt this skill script:

```bash
node "$SKILL_DIR/scripts/mock-preview-server.mjs" --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
```

Preview requirements:

- Serve fixed mock endpoints with production-identical paths, methods, and payloads.
- Preview both current-format Web Component JS artifacts: `/preview/login` for 登录页 and `/preview/home` or `/` for 首页.
- Seed `window.contextPath`, `window.userId`, `window.userName`, and `window.logoPath` only for dev preview.
- Provide test data for config, public letters, my letters, service phones, letter types, and evaluate dimensions.
- Cover visitor, logged-in user, `showPhone=true`, `showPhone=false`, empty lists, `draft`, `to_review`, `reviewed`, and `evaluated`.
- Serve fixed write/detail/edit jump URLs as mock pages.
- Support either same-origin static preview or use as a framework dev proxy target.
- Never let mock globals or mock transport override real host values in production.
- Keep preview-only shells, routes, globals, logo, and test data outside the production bundle.

## Test Workflow

1. Discover scripts: install, dev, typecheck, lint, test, build, preview. State missing scripts explicitly.
2. Static checks: install deps, typecheck, lint/format, unit tests, production build.
3. API tests: `buildPortalUrl`, `hasLoggedInUser`, POST credentials/headers, GET logout redirect, query conversion, response parsing, success/error, list/total extraction, fixed jumps.
4. Functional smoke: visitor with `showPhone` true/false, public letters, tabs, search, read count, notice/write, login validation, SMS countdown, login error feedback, login `data` redirect, user menu, filters, draft edit/delete, withdraw, evaluate, logout.
5. UI smoke: PC and mobile business flows work, loading/empty/error/disabled states are reachable, dialogs/drawers can complete their actions, retries work, and failed API calls restore operable state. Do not validate against current style details.
6. RC checks: artifact exists, source map policy, paths under `contextPath`, no production mock dependency, no preview/test-data markers in production JS, endpoints/jumps unchanged, rollback artifact known.

## Release Workflow

1. Discover target from current build config by running `scripts/detect-build-artifacts.mjs --root .`. For this repo: `pnpm build:home` and `pnpm build:login` produce Web Component JS files.
2. Confirm inputs: environment, branch/commit, build commands, JS artifact destination, source map policy, rollback version.
3. Build: run production build for 首页 and 登录页, record `portal.min.js` and `login.min.js`, do not hand-edit generated artifacts.
4. Inspect: both JS files exist, register expected custom elements, include injected CSS, contain no dev mocks or preview markers, endpoints/jumps unchanged, non-root `contextPath` safe.
5. Stage: mount `<principal-mailbox-home-widget>` and `<principal-mailbox-login-widget>` with required attributes; verify `contextPath`, `logoPath`, `userId`, cookie requests, fixed APIs, fixed jumps, PC/mobile business rendering.
6. Release: publish/copy the two JS artifacts using discovered mechanism and record location/version for each.
7. Smoke: login custom element, homepage custom element, logo/global values, public letters, service phone, my letters, fixed jumps, mobile, blocking console errors.
8. Notes: version/commit, build commands, `portal.min.js` path, `login.min.js` path, changes, contract unchanged, smoke result, known issues, rollback version.
9. Rollback: restore prior `portal.min.js` and `login.min.js`; retest login, homepage, my letters, fixed jumps.

## Style Boundary

No current-project concrete style details are part of this skill. New project visuals must be supplied by the user's UI style description, confirmed homepage element answers, AI-supplemented professional school-portal design direction, worldwide university-homepage inspiration, and a confirmed design image generated before implementation. The design image must be generated after homepage elements are confirmed; it is the implementation reference for page structure, module placement, visual hierarchy, density, and interaction states, but not a source of business logic. If the design image fails the skill element contract, regenerate it. Do not copy a single university homepage; different schools must receive meaningfully different templates with similarity below 50%. Code must restore the confirmed design one-to-one and pass screenshot comparison before handoff.

## Copy-Paste Prompt Skeleton

```md
请生成一个“校长信箱”前端项目。默认技术栈为 React + Ant Design：空目录或用户未指定技术栈时必须用 React + Ant Design；已有工程遵循现有技术栈，已有 React 工程默认使用 Ant Design UI 组件。项目结构可以自行组织，但必须完整复用既有后端接口、宿主全局变量、payload 和跳转地址。

视觉前置：开始实现前，必须先让用户输入一段 UI 风格描述；然后逐项询问首页业务元素并保存带 `"__confirmedByUser": true` 的 homepage.answers.json；5 分钟无应答时可使用 timeout defaults；首页元素敲定之前不得生成设计稿。模型要尽可能补充专业学校门户框架、学校特色识别和精致优美的视觉细节，并学习吸收世界各地大学首页的成熟信息架构和视觉组织方式，博采众长、多创新，不复制任何单一高校模板；然后优先用 imagegen2 基于风格描述、已确认首页元素和整个技能合同生成一张同时覆盖登录页和首页的设计稿/效果图。预览图/设计稿必须遵守两页入口、我的信件登录后二级视图、React + Ant Design 默认组件模型、错误反馈、loading/disabled、验证码 60 秒倒计时、预览/生产隔离等全量约束；不能只按视觉风格自由出图。给不同学校出图时模板相似度不得高于 50%，至少在首页框架、主视觉构图、模块顺序、色彩系统、校园符号、组件处理六项中拉开差异。设计稿必须只使用已确认首页元素：开启元素必须出现，关闭元素不得出现，不允许自由发挥新增业务模块。设计稿缺技能要求元素、出现关闭元素或新增未确认模块时必须重生成。设计稿经用户确认后才进入工程实现；代码前必须创建 design-fidelity.map.md，代码必须按确认设计稿一比一实现页面结构、模块位置、比例密度、视觉层级和交互状态；交付前必须截图对照登录页和首页，明显不一致时继续改。缺少风格描述、首页元素答案或确认后的设计稿时，不得创建工程文件、业务页面、mock 或发布产物。设计稿不覆盖接口、全局变量、payload、跳转、交互和产物合同。

交付强制要求：如果任务是生成或实现前端项目，必须创建/修改真实工程文件，不允许只输出提示词、说明文档、计划、伪代码或孤立代码片段。空目录必须初始化可运行 React + Ant Design 前端工程；已有工程必须融入现有技术栈和目录，若已有工程是 React 则默认使用 Ant Design。最终回复必须列出实际文件路径、启动命令、mock 预览命令、生产构建命令、验证结果、登录页产物路径和首页产物路径。只有用户明确要求“只生成提示词/文档/规范”时，才允许文本交付。

样式边界：不要把当前项目的颜色、图片、间距、圆角、阴影、字体或 CSS 数值写入合同。新项目样式来自用户风格描述、已确认首页元素、AI 补充的学校门户专业化设计方向、全球高校首页优秀模式的综合吸收和确认后的设计稿；本任务要求业务逻辑完整，不允许固化单一模板。

全局变量：window.contextPath、window.userId、window.userName、window.logoPath。所有相对接口和页面地址必须经过 buildPortalUrl(path) 拼接 window.contextPath；登录态使用 window.userId；用户名使用 window.userName || '用户'；logo 使用 buildPortalUrl(window.logoPath || '')。

固定接口：短信 POST /plugins/xzxx/portal/sms { phone }；登录 POST /plugins/xzxx/portal/doLogin { phone, code }；退出 GET /admin/upms/login/doLogout?redirect=${buildPortalUrl('/plugins/xzxx/portal/index')}；配置 POST /plugins/xzxx/portal/getConfig {}；电话 POST /plugins/xzxx/portal/phoneList；类型 POST /plugins/xzxx/portal/letterTypeList；来信选登 POST /plugins/xzxx/portal/registerLetters；我的信件 POST /admin/api/query/xzxx_task_startByMeList；评价维度 POST /plugins/xzxx/portal/getEvaluateList；阅读 POST /plugins/xzxx/portal/read { bizId: readId }；评价 POST /admin/api/execute/xzxx_letter_rate { params: { letterParam: { bizId, rateForm } } }；撤回 POST /admin/api/execute/xzxx_letter_startBackTo { params: { letterParam: { bizId } } }；删除 POST /admin/api/execute/xzxx_letter_remove { params: { letterParam: { bizId } } }。

固定跳转：登录 /plugins/xzxx/portal/login；统一认证 /plugins/xzxx/portal/ids-login；写信 /page/xzxx/formPage；详情 /page/xzxx/formPage#/?bizId=${encodeURIComponent(rowId)}&source=view；编辑 /page/xzxx/formPage#/?bizId=${encodeURIComponent(rowId)}。跳转地址都经过 buildPortalUrl；详情/编辑/写信用 window.open(url, '_blank', 'noopener,noreferrer')。

打包产物格式：必须先运行 `scripts/detect-build-artifacts.mjs --root .`，再按当前工程构建形式反推确定。本仓库当前不是普通多 HTML 页面产物，而是两个 Vite library IIFE Web Component JS：`pnpm build:home` 由 `src/entry-home-component.ts` 输出 `portal.min.js` 并注册 `<principal-mailbox-home-widget>`；`pnpm build:login` 由 `src/entry-login-component.ts` 输出 `login.min.js` 并注册 `<principal-mailbox-login-widget>`。CSS 由构建插件注入 JS。不要要求登录页/首页产物必须是 `index.html` 目录。

预览/生产隔离：预览环境可以提供 mock 接口、mock 全局变量、测试数据、预览 HTML shell、`/preview/*` 路由和 `/__artifact/*` 加载器；生产产物必须是纯净的两个 JS widget，只读取宿主 window 全局变量、调用真实同路径接口并执行固定跳转。生产 JS 不得包含 mock 数据、`mock-user`、`mock-logo.svg`、本地预览文案、`/preview/`、`/__artifact/`、`mock-preview-server`、`localhost`、`127.0.0.1`，不得 import mock 目录，不得启动 mock server，不得覆盖宿主 globals。预览服务只能外部托管生产 JS 做烟测，不能成为产物的一部分。

业务入口：固定两个，登录页和首页。登录页承载手机号短信登录、统一认证入口和校验。首页承载来信选登、我要写信、我的信件登录后二级视图、来信须知确认、校园服务电话、评价弹窗、详情/编辑/写信固定跳转。不要把我的信件、服务电话、评价等模块打成独立页面产物，除非用户另行明确要求。

页面与状态：状态 reviewed/evaluated 为已回复，draft 为草稿，to_review/to_confirm/suspend/xf_doing/xf_done 为处理中。默认进度：信件提交、信件分派、信件回复、信件评价。

业务细节：登录 redirect 兼容 redirect/redirectUrl/redirectURI/redirect_uri；手机号校验 /^1\d{10}$/；验证码发送中禁用按钮，发送成功才启动 60 秒倒计时，倒计时显示 `{n}s后重发`，失败不倒计时并展示错误；登录 submitUrl 只允许覆盖登录路径；登录失败保留输入并反馈错误，登录成功优先把接口响应 `data` 当作重定向链接跳转，`data` 为空时再兼容 redirectUrl/redirectURI/url/location/targetUrl。首页生成前先用 scripts/home-elements-dialog.mjs --mode questions 逐项询问业务元素，不问样式；回答必须保存为 homepage.answers.json，并包含 `"__confirmedByUser": true`；5 分钟无应答时可使用 timeout defaults。首页内部必须有 home/mail 视图能力；我的信件列表必须是登录后展示的首页二级视图，不是独立打包页；未登录不得请求或渲染我的信件列表，只能跳登录并带当前地址 view=mail redirect；已登录进入 mail 视图后才请求 startByMeList。公开信件未登录跳登录 redirect，已登录打开详情后调用 read 并本地阅读量 +1。写信前必须 getConfig，有 noticeContent 则确认须知后再跳写信。showPhone=false 隐藏电话入口并关闭抽屉。我的信件筛选 title/status/type；草稿编辑/删除，to_review 撤回，reviewed/evaluated 评价；删除/撤回二次确认；评价维度必填并提交 remark。config/phone/type/evaluate 要缓存，并发复用 Promise；列表请求要有竞态保护。

交互标准：所有异步动作要有 loading/error/success/disabled 状态；字段错误贴近字段反馈，接口/网络错误用统一消息区、toast 或弹窗反馈；错误文案优先后端 message/msg/errorMessage/error/desc，默认“操作失败，请稍后重试”，网络默认“网络异常，请稍后重试”；取消确认不报错；列表要有 loading/empty/error/retry/load-more/no-more；弹窗和抽屉要有 submitting、validation error、api error 和关闭重置。

工程步骤：先完成 UI 风格描述输入；再逐项询问首页业务元素并保存带 `"__confirmedByUser": true` 的 homepage.answers.json；然后基于风格和首页元素生成设计稿并取得用户确认；设计稿不符合技能元素时重生成；发现目标项目和脚本；空目录或未指定技术栈时初始化 React + Ant Design；运行 `scripts/detect-build-artifacts.mjs --root .`；读取 bundler 配置和实际构建输出反推出产物格式；生成或修改工程文件；设计 API 合同层、host globals helper、redirect helper、模型归一化、PC/mobile 页面；实现 dev mock shell，但必须与生产 build 完全隔离；先测合同层，再根据确认设计稿创建 design-fidelity.map.md，并按它一比一做 UI；逐页完成 loading/empty/error/disabled/confirm/debounce/race guard；PC 和移动端业务流程独立，样式细节不入合同。最低落地文件组：design-fidelity.map.md、登录页 Web Component entry、首页 Web Component entry、portal contract、request、redirect、normalize、query、mock preview、contract tests/checks；文件名可按技术栈调整但必须有等价文件。

预览步骤：提供本地 mock 预览服务，可使用 scripts/mock-preview-server.mjs --home-js dist-home/portal.min.js --login-js dist-login/login.min.js。服务需提供 /preview/login、/preview/home 和 /preview/mail，固定接口 mock、window.contextPath/userId/userName/logoPath、公开信件、我的信件、服务电话、信件类型、评价维度、showPhone true/false、空列表和各类状态测试数据。mock endpoint 和 payload 必须与生产合同一致，但 mock、预览 shell、测试数据和 dev globals 只能存在于预览环境，生产产物不得依赖或内置。

验证步骤：运行实际 install/typecheck/lint/test/build；启动本地预览并截图对照确认设计稿，验证一比一还原；验证 API 合同、固定跳转、登录/退出、来信须知、服务电话开关、我的信件操作、评价提交、PC/mobile 响应式、构建产物纯净性和回滚版本。

发布步骤：识别发布形态并以当前构建配置为准；确认环境/commit/`pnpm build:home`/`pnpm build:login`/JS artifact destination/rollback；生产构建；分别检查 `portal.min.js` 和 `login.min.js`、自定义元素注册、非根 contextPath、无 mock/preview/test-data/localhost 标记；staging 以 custom element 挂载验证 globals、cookie、接口和跳转；生产发布后烟测登录组件、首页组件、来信选登、我的信件、移动端；输出包含两个 JS 产物路径的发布说明和回滚方案。
```
